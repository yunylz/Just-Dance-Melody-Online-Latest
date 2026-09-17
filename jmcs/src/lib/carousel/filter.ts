
import { Request } from 'express';
import cache from '../cache';
import { createLogger } from '../logger';

const logger = createLogger({ service: "carousel-filter" });

export interface IFilter {
    __class: string;
    [key: string]: any;
}

const filterFunctions: Record<string, (req: Request, params: any) => boolean> = {
    "JD_CarouselSubscriptionFilter": (req, params) => {
        return true;
    },
    "JD_CarouselUserFilter": (req, params) => {
        return params.users.indexOf((req as any).ticket?.pid) !== -1;
    },
    "JD_CarouselCountryFilter": (req, params) => {
        let countries = params.countries ? [...params.countries] : [];

        if (params.groups) {
            // TODO: fetch country groups from cache or db
            // For now, assume it's an array of country codes
            // In og-jmcs it was cache.get("country-groups")
        }

        const country = req.clientCountry;
        const found = countries.indexOf(country) !== -1;
        return params.reversed ? !found : found;
    },
    "JD_CarouselTimeFilter": (req, params) => {
        const now = new Date();
        let checkDate = now;

        if (params.local && req.clientCountry) {
            // TODO: handle local time based on timezone
        }

        if (params.start) {
            const start = new Date(params.start);
            if (!isNaN(start.getTime()) && checkDate < start) return false;
        }

        if (params.end) {
            const end = new Date(params.end);
            if (!isNaN(end.getTime()) && checkDate > end) return false;
        }

        return true;
    },
    "JD_CarouselSkuFilter": (req, params) => {
        if (!req.sku) return false;

        if (params.gameVersion) {
            const gameVersions = Array.isArray(params.gameVersion) ? params.gameVersion : [params.gameVersion];
            if (gameVersions.indexOf(req.sku.gameVersion) === -1) return false;
        }

        if (params.platform) {
            const platforms = Array.isArray(params.platform) ? params.platform : [params.platform];
            if (platforms.indexOf(req.sku.platform) === -1) return false;
        }

        return true;
    }
};

export const acceptsFilters = (req: Request, filters: IFilter[]): boolean => {
    return filters.every(filter => {
        const filterFn = filterFunctions[filter.__class];
        if (!filterFn) {
            logger.error(`Unsupported filter: ${filter.__class}`);
            return false;
        }
        return filterFn(req, filter);
    });
};

export const processFiltersList = (req: Request, filtersList: any): boolean => {
    if (filtersList === null) return false;
    if (typeof filtersList === "boolean") return filtersList;

    if (!Array.isArray(filtersList)) return false;

    return filtersList.some(filters => {
        if (!Array.isArray(filters)) return false;
        return acceptsFilters(req, filters);
    });
};

export default {
    process: processFiltersList,
    acceptsFilters
};
