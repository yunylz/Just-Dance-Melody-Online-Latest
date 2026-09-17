import manageSongs from "./manage-songs";
import manageAvatars from "./manage-avatars";
import manageSkins from "./manage-skins";
import manageBorders from "./manage-borders";
import manageLocs from "./manage-locs";
import manageCarousel from "./manage-carousel";
import migrateCarousel from "./migrate-carousel";
import manageTags from "./manage-tags";
import migrateTags from "./migrate-tags";
import manageAliases from "./manage-aliases";
import managePlaylists from "./manage-playlists";
import manageProfiles from "./manage-profiles";
import manageUgc from "./manage-ugc";
import manageWdf from "./manage-wdf";
import manageQuests from "./manage-quests";
import migrateContentAuth from "./migrate-content-auth";

import { Request, Response, NextFunction } from "express";

export interface ScriptModule {
    list?: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    create?: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    update?: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    delete?: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    [key: string]: any;
}

const registry: Record<string, ScriptModule> = {
    "manage-songs": manageSongs,
    "manage-avatars": manageAvatars,
    "manage-skins": manageSkins,
    "manage-borders": manageBorders,
    "manage-locs": manageLocs,
    "manage-carousel": manageCarousel,
    "migrate-carousel": migrateCarousel,
    "manage-tags": manageTags,
    "migrate-tags": migrateTags,
    "manage-aliases": manageAliases,
    "manage-playlists": managePlaylists,
    "manage-profiles": manageProfiles,
    "manage-ugc": manageUgc,
    "manage-wdf": manageWdf,
    "manage-quests": manageQuests,
    "migrate-content-auth": migrateContentAuth,
};

export default registry;
