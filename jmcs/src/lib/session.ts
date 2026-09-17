import hash from "object-hash";

import cache from "./cache";
import cacheKeys from "./cache-keys";
import { createLogger } from "./logger";
import { ISku } from "../config/skus";

const logger = createLogger({ service: "session-lib" });

const PAIRING_CODE_COUNTER_KEY = "pairing-codes:counter";
const PAIRING_CODE_KEY_PREFIX = "pairing-codes:alive:";
const PAIRING_CODE_LIMIT = 999999;

class Session {
    private cacheKey: string;

    constructor() {
        this.cacheKey = "jmcs:sessions";
    }

    private getSessionCacheKey(sessionId: string) {
        return `${this.cacheKey}:${sessionId}`;
    }

    private getPairingCodeKey(code: string) {
        return `${this.cacheKey}:${PAIRING_CODE_KEY_PREFIX}${code}`;
    }

    private padCode(code: number): string {
        return code.toString().padStart(6, "0");
    }

    /**
     * Checks whether a pairing code is already in use in cache.
     */
    private async isCodeInUse(code: number): Promise<boolean> {
        const result = await cache.get(this.getPairingCodeKey(this.padCode(code)));
        return result.success && result.value !== null;
    }

    /**
     * Generates a unique pairing code using an incrementing Redis counter,
     * matching the behaviour of the original JS implementation.
     * Retries up to 10 times if the current counter value is already in use.
     */
    private async generatePairingCode(): Promise<string | null> {
        const MAX_RETRIES = 10;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            // On first attempt, check if the current counter value is free before incrementing
            if (attempt === 0) {
                const current = await cache.get(PAIRING_CODE_COUNTER_KEY);
                if (current.success && current.value !== null) {
                    const currentVal = parseInt(current.value);
                    const inUse = await this.isCodeInUse(currentVal);
                    if (!inUse) {
                        return this.padCode(currentVal);
                    }
                }
            }

            // Increment counter
            let counterVal = await cache.incr(PAIRING_CODE_COUNTER_KEY);
            if (counterVal === -1) return null;

            // Reset counter if it exceeds the limit
            if (counterVal > PAIRING_CODE_LIMIT) {
                await cache.set(PAIRING_CODE_COUNTER_KEY, 1);
                counterVal = 1;
            }

            const inUse = await this.isCodeInUse(counterVal);
            if (!inUse) {
                return this.padCode(counterVal);
            }

            logger.warn({ message: "Pairing code already in use, retrying.", details: { counterVal, attempt } });
        }

        logger.error({ message: "Failed to generate a unique pairing code after max retries." });
        return null;
    }

    async createSession({
        userId,
        profileId,
        sessionId,
        ticketExpiration,
        sku,
        publicIp,
        pairingInfo,
        populations = []
    }: {
        userId: string;
        profileId: string;
        sessionId: string;
        ticketExpiration: number;
        sku: ISku;
        publicIp: string;
        pairingInfo?: {
            protocol: string;
            pairingUrl: string;
            tlsCertificate: string;
            titleId: string;
            displayName: string;
        };
        populations?: {
            name: string;
            object: string;
            spaceId: string;
            subject: string;
        }[];
    }): Promise<{ success: boolean; pairingCode?: string; sessionId?: string; docId?: string; error?: any }> {
        try {
            const sessionExpiration = Math.max(1, Math.floor(ticketExpiration - (Date.now() / 1000)));

            let pairingCode: string | undefined;

            if (pairingInfo) {
                const generated = await this.generatePairingCode();
                if (!generated) {
                    return { success: false, error: "Failed to generate pairing code." };
                }
                pairingCode = generated;

                const pairingSet = await cache.set(this.getPairingCodeKey(pairingCode), sessionId, sessionExpiration);
                if (!pairingSet.success) {
                    logger.error({ message: "Failed to store pairing code mapping.", details: { pairingCode, sessionId } });
                    return { success: false, error: "Failed to store pairing code mapping." };
                }
            }

            const docId = pairingInfo ? hash(pairingInfo.tlsCertificate) : sessionId;

            const sessionSet = await cache.set(this.getSessionCacheKey(sessionId), {
                userId,
                profileId,
                sessionId,
                sku,
                publicIp,
                pairingInfo: pairingInfo ? { ...pairingInfo, pairingCode } : undefined,
                populations,
                docId,
                createdAt: new Date()
            }, sessionExpiration);

            if (!sessionSet.success) {
                logger.error({ message: "Failed to store session.", details: { sessionId } });
                // Roll back pairing code mapping if session write failed
                if (pairingCode) await cache.delete(this.getPairingCodeKey(pairingCode));
                return { success: false, error: "Failed to store session." };
            }

            return {
                success: true,
                pairingCode,
                sessionId,
                docId
            };
        } catch (err) {
            logger.error({
                message: "Failed to create session.",
                details: { userId, profileId, sessionId, sku, publicIp, pairingInfo, populations },
                error: err
            });
            return { success: false, error: err };
        }
    }

    async getSession(sessionId: string): Promise<ISession | { success: false; error: any }> {
        try {
            const result = await cache.get(this.getSessionCacheKey(sessionId));
            if (!result.success || result.value === null) {
                return { success: false, error: "Session not found." };
            }
            return result.value as ISession;
        } catch (err) {
            logger.error({ message: "Failed to get session from cache.", details: { sessionId }, error: err });
            return { success: false, error: err };
        }
    }

    /**
     * Looks up a session by pairing code.
     * First resolves the pairing code → sessionId mapping, then fetches the session.
     * If the pairing code exists but the session is gone, cleans up the stale key.
     */
    async getSessionByPairingCode(code: string): Promise<ISession | { success: false; error: any }> {
        try {
            const pairingKey = this.getPairingCodeKey(code);

            const pairingResult = await cache.get(pairingKey);

            if (!pairingResult.success || pairingResult.value === null) {
                return { success: false, error: "No session found for pairing code." };
            }

            const sessionId = pairingResult.value as string;
            const sessionKey = this.getSessionCacheKey(sessionId);

            const session = await this.getSession(sessionId);

            if ('success' in session) {
                await cache.delete(pairingKey);
                return { success: false, error: "Session no longer exists." };
            }

            return session;
        } catch (err) {
            logger.error({ message: "Failed to get session by pairing code.", details: { code }, error: err });
            return { success: false, error: err };
        }
    }

    async deleteSession(sessionId: string): Promise<{ success: boolean; error?: any }> {
        try {
            await cache.delete(this.getSessionCacheKey(sessionId));
            return { success: true };
        } catch (err) {
            logger.error({ message: "Failed to delete session from cache.", details: { sessionId }, error: err });
            return { success: false, error: err };
        }
    }
}

export default new Session();