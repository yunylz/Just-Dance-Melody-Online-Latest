const crypto = require("crypto");

const config = require("../config");

const logger = require("./logger").createLogger({ service: "token-lib" })

class Token {
    constructor() {
        this.secret = Buffer.from(config.TOKEN_SECRET, "hex");
        this.algorithm = "aes-256-gcm";
    }

    // Generate a bearer token for some payload (object)
    generate(payload) {
        const iv = crypto.randomBytes(16); // Initialization vector
        const cipher = crypto.createCipheriv(this.algorithm, this.secret, iv);
        let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag().toString("hex");
        // Return token format. iv.authTag.encryptedData
        return `${iv.toString("hex")}.${authTag}.${encrypted}`;
    }

    // Decrypt a token
    decrypt(token) {
        try {
            const [ivHex, authTagHex, encrypted] = token.split(".");
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                this.secret,
                Buffer.from(ivHex, "hex")
            );
            decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
            const decrypted = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
            return JSON.parse(decrypted);
        } catch (err) {
            logger.error("Invalid or tampered token.", err.message);
            return null;
        }
    }
};

module.exports = new Token();