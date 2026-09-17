const crypto = require("crypto");
const config = require("../config");
const logger = require("./logger").createLogger({ service: "auth-file" });

const ALGORITHM = "aes-256-gcm";

/**
 * Encodes an object into a base64-encoded INI-format string.
 */
function encrypt(payload) {
    const lines = [];
    for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined && value !== null) {
            lines.push(`${key}=${value}`);
        }
    }
    return Buffer.from(lines.join("\n"), "utf8").toString("base64");
}

/**
 * Decodes a base64-encoded INI string back into a payload object.
 */
function decrypt(encodedData) {
    try {
        const raw = Buffer.from(encodedData, "base64").toString("utf8");
        const payload = {};
        for (const line of raw.split("\n")) {
            const idx = line.indexOf("=");
            if (idx === -1) continue;
            const key = line.slice(0, idx);
            const value = line.slice(idx + 1);
            payload[key] = value;
        }
        return payload;
    } catch (err) {
        return null;
    }
}

/**
 * Encrypts a plaintext string using AES-256-GCM and returns base64.
 * Used for the TickedId data portion.
 */
function encryptTicket(plaintext) {
    const key = Buffer.from(config.AUTH_FILE_SECRET, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const combined = `${iv.toString("hex")}.${authTag}.${encrypted}`;
    return Buffer.from(combined).toString("base64");
}

/**
 * Decrypts a base64-encoded AES-256-GCM string back to plaintext.
 */
function decryptTicket(encodedData) {
    try {
        const combined = Buffer.from(encodedData, "base64").toString("utf8");
        const [ivHex, authTagHex, ciphertext] = combined.split(".");
        if (!ivHex || !authTagHex || !ciphertext) return null;

        const key = Buffer.from(config.AUTH_FILE_SECRET, "hex");
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(ivHex, "hex")
        );
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

        const decrypted = decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8");
        return decrypted;
    } catch (err) {
        logger.error({ err: err.message }, "Failed to decrypt ticket");
        return null;
    }
}

module.exports = { encrypt, decrypt, encryptTicket, decryptTicket };
