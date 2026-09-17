import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import crypto from "node:crypto";
import objectHash from "object-hash";

import { ISku } from "../config/skus";

import config from "../config";
import { createLogger } from "./logger";
import utils from "./utils";

const logger = createLogger({ service: "s3-lib" });

class S3 {
    public client: S3Client;
    private bucket: string;

    constructor() {
        this.client = new S3Client({
            region: process.env.S3_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
            },
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: true,
        });
        this.bucket = config.S3.BUCKET || "";
    }

    /**
     * Generates the S3 path for a SongDb based on the SKU, hash, and environment.
     * In dev environments the filename uses "songdb.dev.{platform}" so that
     * game clients on the dev channel receive unpublished/draft songs.
     * When isPatreon is true, a ".patreon" suffix is added so patreon users
     * receive a separate songdb that includes patreon-only songs.
     * @param {ISku} sku - The SKU object.
     * @param {string} hash - The hash of the SongDb.
     * @param {string} [jmcsEnv] - The ticket environment ("dev" or "prod").
     * @param {boolean} [isPatreon] - Whether this songdb is for patreon users.
     * @returns {string} The generated S3 path.
     */
    getSongDbPath(sku: ISku, hash: string, jmcsEnv?: string, isPatreon?: boolean) {
        const isDev = jmcsEnv === "dev";
        const patreonTag = isPatreon ? ".patreon" : "";
        const fileTag = isDev ? `songdb.dev${patreonTag}` : `songdb${patreonTag}`;
        const path = `${config.S3.SONGDB_PATH}/${config.ENV}/${fileTag}.${sku.platform}.${hash}.json`;
        return path.replace(/^\/+/, '').replace(/\/\/+/g, '/');
    };

    /**
     * Generates the S3 path for localization data based on its hash.
     * @param {string} hash - The hash of the localization data.
     * @returns {string} The generated S3 path.
     */
    getLocalizationPath(hash: string) {
        const path = `${config.S3.LOCALIZATION_PATH}/${config.ENV}/localization.${hash}.json`;
        return path.replace(/^\/+/, '').replace(/\/\/+/g, '/');
    };

    /**
     * Generates the S3 path for related songs data based on its hash.
     * @param {string} hash - The hash of the related songs data.
     * @returns {string} The generated S3 path.
     */
    getRelatedSongsPath(hash: string) {
        const path = `${config.S3.RELATED_PATH}/${config.ENV}/related-songs.${hash}.json`;
        return path.replace(/^\/+/, '').replace(/\/\/+/g, '/');
    };

    /**
     * Checks if an object exists in the S3 bucket.
     * @param {string} key - The S3 object key to check.
     * @returns {Promise<any>} The HeadObjectCommand output if the object exists.
     */
    async exists(key: string) {
        return await this.client.send(new HeadObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
    };

    /**
     * Generates an HMAC-signed download URL for a given S3 key.
     * Instead of AWS presigned URLs, we use a shared-secret HMAC-SHA256 approach:
     *   message = `/file/jdmo-s3/{key}`
     *   token = HMAC-SHA256(message + timestamp, secret)
     *   URL = {S3_FQDN}/{key}?hmac={timestamp}-{encodeURIComponent(token)}
     *
     * The CDN / origin server validates the HMAC and expiry from the timestamp.
     *
     * @param {string} key - The S3 object key.
     * @param {number} [_expiresIn] - Kept for API compatibility; the HMAC itself
     *   carries a timestamp that the server-side validates.
     * @returns {Promise<string>} The signed URL.
     */
    getSignedDownloadUrl(key: string, _expiresIn: number = 3600) {
        const secret = config.HMAC_SECRET as string;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const message = `/file/${config.S3.BUCKET}/${key}`;

        const digest = crypto
            .createHmac("sha256", secret)
            .update(`${message}${timestamp}`, "utf8")
            .digest("base64");

        const token = encodeURIComponent(digest);
        const signedUrl = `${config.S3.FQDN}/${key}?hmac=${timestamp}-${token}`;

        return signedUrl;
    };

    /**
     * Asserts that a SongDb exists in S3. If it does not exist, uploads it.
     * @param {object} songDb - The SongDb object to assert and upload if missing.
     * @param {ISku} sku - The SKU object.
     * @param {string} [jmcsEnv] - The ticket environment ("dev" or "prod").
     * @param {boolean} [isPatreon] - Whether this songdb is for patreon users.
     * @returns {Promise<string>} The raw path to the uploaded or existing SongDb in S3.
     */
    async assertSongDb(songDb: object, sku: ISku, jmcsEnv?: string, isPatreon?: boolean) {
        const songDbHash = objectHash(JSON.stringify(songDb));
        const bucketSongDbPath = this.getSongDbPath(sku, songDbHash, jmcsEnv, isPatreon);

        try {
            await this.exists(bucketSongDbPath);
            return bucketSongDbPath;
        } catch (e: any) {
            try {
                await this.client.send(new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: bucketSongDbPath,
                    Body: JSON.stringify(songDb),
                    ContentType: "application/json",
                }));
                return bucketSongDbPath;
            } catch (err: any) {
                logger.error({ message: "Failed to upload SongDb to S3", details: { error: err, path: bucketSongDbPath } });
                throw err;
            }
        }
    };

    /**
     * Asserts that localization data exists in S3. If it does not exist, uploads it.
     * @param {object} localization - The localization data to assert and upload if missing.
     * @returns {Promise<string>} The raw path to the uploaded or existing localization data in S3.
     */
    async assertLocalization(localization: object) {
        const hash = objectHash(JSON.stringify(localization));
        const bucketLocalizationPath = this.getLocalizationPath(hash);

        try {
            await this.exists(bucketLocalizationPath);
            return bucketLocalizationPath;
        } catch (e: any) {
            try {
                await this.client.send(new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: bucketLocalizationPath,
                    Body: JSON.stringify(localization),
                    ContentType: "application/json"
                }));
                return bucketLocalizationPath;
            } catch (err: any) {
                logger.error({ message: "Failed to upload localization to S3", details: { error: err, path: bucketLocalizationPath } });
                throw err;
            }
        }
    };

    /**
     * Asserts that related songs data exists in S3. If it does not exist, uploads it.
     * @param {object} relatedSongs - The related songs mapping object.
     * @returns {Promise<string>} The raw path to the uploaded or existing related songs data in S3.
     */
    async assertRelatedSongs(relatedSongs: object) {
        const hash = objectHash(JSON.stringify(relatedSongs));
        const bucketPath = this.getRelatedSongsPath(hash);

        try {
            await this.exists(bucketPath);
            return bucketPath;
        } catch (e: any) {
            try {
                await this.client.send(new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: bucketPath,
                    Body: JSON.stringify(relatedSongs),
                    ContentType: "application/json"
                }));
                return bucketPath;
            } catch (err: any) {
                logger.error({ message: "Failed to upload related songs to S3", details: { error: err, path: bucketPath } });
                throw err;
            }
        }
    };
}

export default new S3();