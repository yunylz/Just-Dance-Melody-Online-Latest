import { Express, NextFunction, Request, Response, Router } from 'express';
import winston from 'winston';

import { ticketRequired } from '../lib/harbour-ticket-client';
import { skuIdRequired } from '../lib/skus-client';
import scores from '../lib/scores';
import songs from '../lib/songs';
import utils from '../lib/utils';
import { ISku } from '../config/skus';
import hubHelper from '../lib/hub-helper';
import { INVALID_COUNTRY, SKU_ROUTE_MISMATCH, SONG_NOT_FOUND } from '../lib/http-codes';
import * as webhook from '../lib/webhook';

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * Checks if client's sku has access to DOTW.
     */
    const skuHasDotw = (req: Request, res: Response, next: NextFunction) => {
        const sku = (req.sku) as ISku;
        if (!sku.hasDotw) return next(SKU_ROUTE_MISMATCH);
        return next();
    };

    /**
     * Checks if client's sku has access to leaderboards.
     */
    const skuHasLeaderboards = (req: Request, res: Response, next: NextFunction) => {
        const sku = (req.sku) as ISku;
        if (!sku.hasLeaderboards) return next(SKU_ROUTE_MISMATCH);
        return next();
    };

    /**
     * Checks if the song passed in the param exists in the database,
     * respecting the jmcsEnv (prod → published only, dev → unpublished only).
     */
    const songExistsInParam = async (req: Request, res: Response, next: NextFunction) => {
        const mapName = req.params.mapName as string;
        const sku = req.sku as ISku;
        const jmcsEnv = req.jmcsEnv;
        const envFilter = utils.getJmcsEnvSongFilter(jmcsEnv);
        const patreonFilter = utils.getPatreonSongFilter(req.isPatreon);
        const combinedFilter = { ...envFilter, ...patreonFilter };

        const songExists = await songs.songExists(mapName, combinedFilter);
        if (!songExists) {
            webhook.ticket({
                title: "🔍 Unauthorized Song Access",
                ip: req.ip as string,
                originalUrl: req.originalUrl as string,
                message: `Song \`${mapName}\` not found or not accessible (env: \`${jmcsEnv}\`)`,
                userId: req.userId,
                profileId: req.profileId
            });
            return next(SONG_NOT_FOUND);
        }
        return next();
    };

    /**
     * Checks if the country passed in param is valid.
     */
    const hasValidCountryInParam = (req: Request, res: Response, next: NextFunction) => {
        const countryId = parseInt(req.params.countryId as string);
        const country = utils.getCountryById(countryId);

        if (!country) return next(INVALID_COUNTRY);
        req.country = country;
        return next();
    };

    /**
     * GET /maps/:mapName/dancer-of-the-week
     *
     * Returns the dancer of the week for given map.
     * Only works in 2019-2022
     */
    publicRouter.get(
        '/maps/:mapName/dancer-of-the-week',
        ticketRequired, skuIdRequired, skuHasDotw, songExistsInParam,
        async (req: Request, res: Response, next: NextFunction) => {
            const mapName = req.params.mapName as string;
            const sku = req.sku as ISku;

            const dotw = await scores.getDancerOfTheWeek({ mapName, sku });
            return res.send(dotw);
        }
    );

    /**
     * GET /maps/:mapName/world
     *
     * Returns the world leaderboard for given map.
     * Only works in 2016-2018
     */
    publicRouter.get(
        '/maps/:mapName/world',
        ticketRequired, skuIdRequired, skuHasLeaderboards, songExistsInParam,
        async (req: Request, res: Response, next: NextFunction) => {
            const mapName = req.params.mapName as string;
            const sku = req.sku as ISku;
            const platform = req.query.platform as string | undefined;
            const count = req.isS2s ? undefined : parseInt(req.query.count as string ?? "5");

            const entries = await scores.getLeaderboard({
                mapName, sku, filters: { platform }, count
            });

            return res.send({
                __class: 'LeaderboardList',
                entries,
            });
        }
    );

    /**
     * GET /maps/:mapName/countries/:countryId
     *
     * Returns the country leaderboard for given map and country.
     * Only works in 2016-2018
     */
    publicRouter.get(
        '/maps/:mapName/countries/:countryId',
        ticketRequired, skuIdRequired, skuHasLeaderboards, songExistsInParam, hasValidCountryInParam,
        async (req: Request, res: Response, next: NextFunction) => {
            const mapName = req.params.mapName as string;
            const sku = req.sku as ISku;
            const country = req.country as any;
            const platform = req.query.platform as string | undefined;
            const count = req.isS2s ? undefined : parseInt(req.query.count as string ?? "5");

            const entries = await scores.getLeaderboard({
                mapName, sku, filters: {
                    country, platform
                }, count
            });

            return res.send({
                __class: 'LeaderboardList',
                entries,
            });
        }
    );

    /**
     * GET /maps/:mapName/friends
     *
     * Returns the friends (of client) leaderboard for given map.
     * Only works in 2016-2018
     * Lists friends from Hub
     */
    publicRouter.post(
        '/maps/:mapName/friends',
        ticketRequired, skuIdRequired, skuHasLeaderboards, songExistsInParam,
        async (req: Request, res: Response, next: NextFunction) => {
            const mapName = req.params.mapName as string;
            const sku = req.sku as ISku;
            const platform = req.query.platform as string | undefined;
            const count = req.isS2s ? undefined : parseInt(req.query.count as string ?? "5");
            const friends = await hubHelper.getFriends(req.userId, sku.platform);

            const entries = await scores.getLeaderboard({
                mapName, sku, filters: {
                    profileIds: friends, platform
                }, count
            });

            return res.send({
                __class: 'LeaderboardList',
                entries,
            });
        }
    );
};