import { createLogger } from "./logger";

const logger = createLogger({ service: "metrics" });



/**
 * Emits an HTTP request metric to Loki.
 * Query in Grafana with: {service="metrics", type="http_request"}
 */
export function recordHttpRequest({
    method,
    path,
    status,
    latencyMs,
    ip,
    skuId,
}: {
    method: string;
    path: string;
    status: number;
    latencyMs: number;
    ip: string;
    skuId?: string;
}) {
    logger.info({
        message: "http_request",
        details: { method, path, status, latencyMs, ip, skuId: skuId ?? null },
    });
}

/**
 * Emits a system stats metric to Loki.
 * Query in Grafana with: {service="metrics", type="system_stats"}
 */
export function recordSystemStats() {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    logger.info({
        message: "system_stats",
        details: {
            uptimeSeconds: process.uptime(),
            memoryMB: {
                rss: (mem.rss / 1024 / 1024).toFixed(2),
                heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2),
                heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2),
            },
            cpu: {
                userMs: (cpu.user / 1000).toFixed(2),
                systemMs: (cpu.system / 1000).toFixed(2),
            },
        },
    });
}

/**
 * Emits a custom app metric to Loki.
 * Query in Grafana with: {service="metrics"} |= "cache_hit" etc.
 *
 * @example
 * recordAppMetric("cache_hit", { key: "skus" });
 * recordAppMetric("sku_lookup", { skuId: "jd2022-nx-all", hit: true });
 */
export function recordAppMetric(event: string, details: Record<string, any> = {}) {
    logger.info({
        message: event,
        details,
    });
}