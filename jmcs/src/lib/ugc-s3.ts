import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import config from "../config";
import { createLogger } from "./logger";

const logger = createLogger({ service: "ugc-s3" });

class UgcS3 {
    public client: S3Client;
    private bucket: string;

    constructor() {
        this.client = new S3Client({
            region: config.UGC_S3.REGION || "auto",
            credentials: {
                accessKeyId: config.UGC_S3.ACCESS_KEY_ID || "",
                secretAccessKey: config.UGC_S3.SECRET_ACCESS_KEY || "",
            },
            endpoint: config.UGC_S3.ENDPOINT,
            forcePathStyle: true,
            // R2 doesn't support the SDK's flexible checksums (x-amz-checksum-*)
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        });
        this.bucket = config.UGC_S3.BUCKET || "";
    }

    /**
     * Generates a signed PUT URL for uploading a UGC content file to S3.
     *
     * @param key - The S3 object key (e.g. "ugc/{ugcId}/{fileName}").
     * @param contentType - The MIME type of the file being uploaded.
     * @param expiresIn - Seconds until the URL expires. Default 3600 (1 hour).
     * @returns A signed PUT URL string.
     */
    /**
     * Builds the full S3 key with an environment prefix.
     */
    buildKey(ugcId: string, fileName: string): string {
        return `${config.ENV}/ugc/${ugcId}/${fileName}`;
    }

    async getSignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(this.client, command, {
            expiresIn,
            // R2 needs content-type in signed headers or it recalculates the
            // signature including it and mismatches.
            signableHeaders: new Set(["host", "content-type"]),
        });
        return url;
    }

    /**
     * Generates the public base URL for a UGC document's content files.
     * Files are served directly from the S3 bucket via the CDN FQDN.
     *
     * @param ugcId - The UGC document ID.
     * @returns The base URL string ending with "/".
     */
    getContentBaseUrl(ugcId: string): string {
        const base = config.UGC_S3.FQDN || `https://${this.bucket}.s3.amazonaws.com`;
        return `${base}/${config.ENV}/ugc/${ugcId}/`;
    }
}

export default new UgcS3();
