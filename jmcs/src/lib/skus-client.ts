import express from "express";

import { createLogger } from "./logger";
import { SKU_REQUIRED, SKU_INVALID, SKU_APP_ID_MISMATCH } from "./http-codes";
import cache from "./cache";
import cacheKeys from "./cache-keys";
import { recordSkuHit, recordSkuRejection } from "./metrics-store";
import skusLib from "./skus";
import utils from "./utils";
import * as webhook from "./webhook";


const logger = createLogger({ service: "skus-client" });

/**
 * Middleware that requires a valid `x-skuid` header on the request.
 * Validates the SKU ID against the cached SKU map loaded at boot.
 *
 * @throws {SKU_REQUIRED} If the `x-skuid` header is missing.
 * @throws {SKU_INVALID} If the `x-skuid` header does not match any known SKU.
 */
export const skuIdRequired = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) => {
    const ip = req.ip as string;

    const isDev = utils.isDev();
    const isS2s = req.isS2s;

    let skuId = req.headers["x-skuid"] as string;

    if (!skuId) {
        logger.warn({
            message: "No SKU ID provided in request headers.",
            details: { skuId, ip }
        });
        recordSkuRejection({ skuId: "", ip, reason: "missing", timestamp: new Date().toISOString() });
        webhook.sku({
            title: "🚫 SKU Required",
            message: "No SKU ID provided in request headers.",
            ip,
            skuId: "N/A"
        });
        return next(SKU_REQUIRED);
    }

    const skus = skusLib.info;

    if (!skus) {
        logger.error({ message: "Failed to retrieve SKUs." });
        recordSkuRejection({ skuId, ip, reason: "unavailable", timestamp: new Date().toISOString() });
        webhook.sku({
            title: "🛑 SKUs Unavailable",
            message: "Failed to retrieve SKU information from internal library.",
            ip,
            skuId
        });
        return next(SKU_INVALID);
    }

    const skuData = skus[skuId];

    if (!skuData) {
        logger.warn({
            message: "Invalid SKU ID provided in request headers.",
            details: { skuId, ip }
        });
        recordSkuRejection({ skuId, ip, reason: "invalid", timestamp: new Date().toISOString() });
        webhook.sku({
            title: "❌ Invalid SKU ID",
            message: "The provided SKU ID does not match any known SKUs.",
            ip,
            skuId
        });
        return next(SKU_INVALID);
    }


    const doesAppIdMatch = req.appId && (req.appId === skuData.appId);

    // Allow SKU appId check to be bypassed via x-jmcs-bypass-sku-appid header
    const bypassSkuAppId = !!(req.headers['x-jmcs-bypass-sku-appid']);

    // S2S, local envs, or bypass header tokens get to bypass appId check
    if (!isS2s && !utils.isLocal() && !bypassSkuAppId && req.appId && !doesAppIdMatch) {

        logger.warn({
            message: "SKU App ID mismatch to ticket.",
            details: { skuId, ip, appId: req.appId, skuAppId: skuData.appId }
        });
        recordSkuRejection({
            skuId, ip, appId: req.appId, skuAppId: skuData.appId, reason: "appId_mismatch", timestamp: new Date().toISOString()
        });
        webhook.sku({
            title: "⚠️ SKU App ID Mismatch",
            message: "SKU App ID does not match the ticket App ID.",
            ip,
            skuId,
            appId: req.appId,
            skuAppId: skuData.appId
        });
        return next(SKU_APP_ID_MISMATCH);
    }

    recordSkuHit();

    // Attach the matched SKU to the request for downstream use
    (req as any).sku = skuData;
    (req as any).skuId = skuId;

    next();
};