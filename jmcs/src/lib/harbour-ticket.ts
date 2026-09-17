import crypto from "crypto";
import config from "../config";
import { TICKET_EXPIRED, UNAUTHORIZED } from "./http-codes";
import utils from "./utils";

const logger = require("./logger").createLogger({ service: "token" });

class Ticket {
    private secret: string;
    private expiration: number;
    private _encryptionKey: Buffer | null = null;

    constructor() {
        this.secret = config.HARBOUR_TICKET_SECRET;
        this.expiration = 3 * 60 * 60;
    }

    private get encryptionKey(): Buffer {
        if (this._encryptionKey) return this._encryptionKey;
        const buf = Buffer.from(this.secret, "base64");
        this._encryptionKey = buf.length === 32
            ? buf
            : crypto.createHash("sha256").update(buf).digest();
        return this._encryptionKey;
    }

    // ─── Encoding helpers ─────────────────────────────────────────────────────

    private base64url(input: string | Buffer): string {
        return Buffer.from(input)
            .toString("base64")
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    }

    private base64urlDecode(input: string): string {
        let padded = input;
        while (padded.length % 4) padded += "=";
        padded = padded.replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(padded, "base64").toString("utf8");
    }

    private base64urlDecodeToBuffer(input: string): Buffer {
        let padded = input;
        while (padded.length % 4) padded += "=";
        padded = padded.replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(padded, "base64");
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Decrypts and validates a Harbour JWE ticket.
     *
     * Format: `<header>..<iv>.<ciphertext>.<tag>` (5 parts, dir + A256GCM)
     * The second part is always empty (no encrypted key) since `dir` is used.
     *
     * @param token - The JWE compact serialization string to decrypt.
     * @returns A {@link TicketDecryptResult} containing either the decoded payload or an error.
     */
    decrypt(token: string, options?: { bypassExpiry?: boolean }): TicketDecryptResult {
        try {
            const parts = token.split(".");

            if (parts.length !== 5) {
                return { error: UNAUTHORIZED };
            }

            const [headerB64, , ivB64, ciphertextB64, tagB64] = parts;

            if (!headerB64 || !ivB64 || !ciphertextB64 || !tagB64) {
                return { error: UNAUTHORIZED };
            }

            const header = JSON.parse(this.base64urlDecode(headerB64));
            if (header.alg !== "dir" || header.enc !== "A256GCM") {
                return { error: UNAUTHORIZED };
            }

            const key = this.encryptionKey;
            const iv = this.base64urlDecodeToBuffer(ivB64);
            const ciphertext = this.base64urlDecodeToBuffer(ciphertextB64);
            const tag = this.base64urlDecodeToBuffer(tagB64);

            const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
            decipher.setAuthTag(tag);
            decipher.setAAD(Buffer.from(headerB64, "ascii"));

            const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            const claims: TicketClaims = JSON.parse(plaintext.toString("utf8"));

            const now = Math.floor(Date.now() / 1000);
            if (!utils.isLocal() && !options?.bypassExpiry && (claims.exp && claims.exp < now)) {
                return { error: TICKET_EXPIRED };
            }

            return { result: { header, claims }, error: null };
        } catch (err: any) {
            logger.error({
                message: "Failed to decrypt token — invalid or tampered.",
                error: { message: err?.message, stack: err?.stack },
            });
            return { error: UNAUTHORIZED };
        }
    }

    /**
     * Extracts and returns only the claims from a token without additional context.
     * Returns `null` if the token is invalid or expired.
     *
     * @param token - The token string to extract claims from.
     * @returns The decoded {@link TicketClaims} object, or `null` if verification failed.
     */
    getClaims(token: string): TicketClaims | null {
        const tokenResult = this.decrypt(token);
        if (tokenResult.error || !tokenResult.result) return null;
        return tokenResult.result.claims;
    }

    /**
     * Returns whether a token is currently valid (well-formed, correctly encrypted, and not expired).
     *
     * @param token - The token string to validate.
     * @returns `true` if the token is valid, `false` otherwise.
     */
    isValid(token: string): boolean {
        return this.decrypt(token).error === null;
    }
}

export default new Ticket();