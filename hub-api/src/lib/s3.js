const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const config = require("../config");

class S3Lib {
    constructor() {
        this.client = new S3Client({
            region: config.S3.REGION,
            endpoint: config.S3.ENDPOINT,
            credentials: {
                accessKeyId: config.S3.ACCESS_KEY_ID,
                secretAccessKey: config.S3.SECRET_ACCESS_KEY,
            },
        });
    }

    /**
     * Uploads a file to S3/R2.
     * @param {Buffer} fileBuffer 
     * @param {string} fileName 
     * @param {string} contentType 
     * @returns {Promise<string>} The public URL of the uploaded file.
     */
    async uploadFile(fileBuffer, fileName, contentType) {
        const command = new PutObjectCommand({
            Bucket: config.S3.BUCKET,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await this.client.send(command);

        // Construct the public URL
        const baseUrl = config.S3.FQDN.endsWith('/') ? config.S3.FQDN : `${config.S3.FQDN}/`;
        return `${baseUrl}${fileName}`;
    }
}

module.exports = new S3Lib();
