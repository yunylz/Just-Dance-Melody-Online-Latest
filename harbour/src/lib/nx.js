/**
 * @module nx
 *
 * Nintendo Switch (NX) JWT verification.
 *
 * Nintendo issues RS256-signed JWTs during the Switch login flow.  The public
 * keys used to verify them are fetched live from Nintendo's JWKS endpoint
 * (the `jku` URL from the token header).
 *
 * Key format: Nintendo returns JWK objects with standard `n`/`e` RSA fields.
 * We convert them to a Node `KeyObject` via `crypto.createPublicKey()` rather
 * than trying to parse the `x5c` certificate chain, which avoids the PEM
 * formatting pitfalls entirely.
 */

const axios = require("axios");
const crypto = require("node:crypto");
const jsonwebtoken = require("jsonwebtoken");
const utils = require("./utils");
const logger = require("./logger").createLogger({ service: "nx" });

class NX {
    /**
     * @param {Object} options
     * @param {string} options.issuer - The `jku` URL from the token header,
     *   pointing to Nintendo's JWKS endpoint for the environment that issued
     *   the token.  Falls back to the standard lp1 BaaS endpoint if omitted.
     */
    constructor({ issuer }) {
        this.endpoints = {
            certificates: issuer || "https://e0d67c509fb203858ebcb2fe3f88c2aa.baas.nintendo.com/1.0.0/certificates"
        };
    }

    /**
     * Fetches Nintendo's JWKS (JSON Web Key Set) from the certificates endpoint.
     *
     * @returns {Promise<{ keys: Object[] }>} The JWKS object containing RSA public keys.
     * @throws If the HTTP request fails.
     */
    async getCertificates() {
        try {
            const response = await axios.get(this.endpoints.certificates);
            return response.data;
        } catch (error) {
            logger.error({ message: "Failed to fetch Nintendo Switch certificates", error: error.message });
            throw error;
        }
    }

    /**
     * Verifies the RS256 signature of a Nintendo Switch JWT.
     *
     * Fetches the matching public key from Nintendo's JWKS endpoint using the
     * `kid` from the token header, then verifies the signature using Node's
     * `crypto.createPublicKey()` with the JWK's `n`/`e` parameters.
     *
     * @param {string} token - The raw Nintendo Switch JWT string.
     * @returns {Promise<{ valid: boolean }>}
     */
    async verifyTokenSignature(token) {
        const [header] = token.split(".");

        let decodedHeader;
        try {
            decodedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf-8"));
        } catch (error) {
            throw new Error("Invalid token format — could not decode header");
        }

        // Fetch Nintendo's current public keys
        const certs = await this.getCertificates();

        // Match by key ID (kid) from the token header
        const jwk = certs.keys.find(k => k.kid === decodedHeader.kid);
        if (!jwk) {
            throw new Error(`No matching public key found for kid: ${decodedHeader.kid}`);
        }

        // Convert the JWK (n + e RSA parameters) directly to a Node KeyObject.
        // This avoids the x5c certificate chain entirely and is the correct
        // approach — x5c wraps the key in an X.509 cert, not a raw SPKI key,
        // so -----BEGIN PUBLIC KEY----- headers do not apply to it.
        let publicKey;
        try {
            publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
        } catch (error) {
            throw new Error(`Failed to import public key: ${error.message}`);
        }

        try {
            jsonwebtoken.verify(
                token,
                publicKey,
                {
                    algorithms: [decodedHeader.alg],
                    ignoreExpiration: utils.isDev() // ignore expiration if on dev environment
                }
            );
            return { valid: true };
        } catch (error) {
            logger.warn({ message: "Switch token signature verification failed", error: error.message });
            return { valid: false };
        }
    }
}

module.exports = NX;