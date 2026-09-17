import { getRedisClient } from "./clients/redis";
import { createLogger } from "./logger";

const logger = createLogger({ service: "cache" });

class Cache {
    private get client() {
        return getRedisClient();
    }

    /**
     * Serializes a value to a string for storage in Redis.
     * Strings are returned as-is; all other types are JSON-stringified.
     */
    private serialize(value: any): string {
        return typeof value === "string" ? value : JSON.stringify(value);
    }

    /**
     * Deserializes a value retrieved from Redis.
     * Attempts JSON.parse; falls back to returning the raw string if parsing fails.
     * Returns null if the input is null (key did not exist).
     */
    private deserialize(value: string | null): any {
        if (value === null) return null;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    /**
     * Retrieves a single value from the cache by key.
     *
     * @param key - The cache key to look up.
     * @returns `{ success: true, value }` where value is the deserialized result,
     *          or `{ success: false, error }` if the operation failed.
     *
     * @example
     * const { success, value } = await cache.get("user:42");
     */
    async get(key: string): Promise<any> {
        try {
            const value = await this.client.get(key);
            return { success: true, value: this.deserialize(value) };
        } catch (err: any) {
            logger.error(`Failed to get key "${key}" from cache: ${err}`);
            return { success: false, error: err };
        }
    }

    /**
     * Retrieves multiple values from the cache in a single round-trip.
     * Missing keys will have a value of `null` in the returned map.
     *
     * @param keys - Array of cache keys to look up.
     * @returns A record mapping each key to its deserialized value (or null if missing).
     *          Returns an empty object if the operation failed.
     *
     * @example
     * const result = await cache.getMany(["user:1", "user:2"]);
     * // { "user:1": { id: 1, name: "Alice" }, "user:2": null }
     */
    async getMany(keys: string[]): Promise<Record<string, any>> {
        try {
            const values = await this.client.mGet(keys);
            return keys.reduce((acc: Record<string, any>, key, index) => {
                acc[key] = this.deserialize(values[index]);
                return acc;
            }, {});
        } catch (err: any) {
            logger.error(`Failed to get keys "${keys}" from cache: ${err}`);
            return {};
        }
    }

    /**
     * Stores a single value in the cache with an optional TTL.
     *
     * @param key - The cache key to write.
     * @param value - The value to store. Objects are automatically JSON-stringified.
     * @param ttl - Time-to-live in seconds. Defaults to 60.
     * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
     *
     * @example
     * await cache.set("user:42", { id: 42, name: "Alice" }, 300);
     */
    async set(key: string, value: any, ttl?: number): Promise<{ success: boolean; error?: any }> {
        try {
            const options: { EX?: number } = {};

            if (typeof ttl === "number") {
                options.EX = ttl;
            }

            await this.client.set(key, this.serialize(value), options);
            return { success: true };
        } catch (err: any) {
            logger.error(`Failed to set key "${key}" in cache: ${err}`);
            return { success: false, error: err };
        }
    }

    /**
     * Stores multiple key-value pairs in the cache in a single round-trip.
     * Note: Redis `MSET` does not support per-key TTLs. If you need TTLs,
     * use multiple `set()` calls instead.
     *
     * @param data - A record of key-value pairs to store. Values are automatically serialized.
     * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
     *
     * @example
     * await cache.setMany({ "user:1": { id: 1 }, "user:2": { id: 2 } });
     */
    async setMany(data: Record<string, any>): Promise<{ success: boolean; error?: any }> {
        try {
            const entries = Object.entries(data).flatMap(([key, value]) => [
                key,
                this.serialize(value),
            ]);
            await this.client.mSet(entries);
            return { success: true };
        } catch (err: any) {
            logger.error(`Failed to set keys in cache: ${err}`);
            return { success: false, error: err };
        }
    }

    /**
     * Deletes a single key from the cache.
     *
     * @param key - The cache key to delete.
     * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
     *
     * @example
     * await cache.delete("user:42");
     */
    async delete(key: string): Promise<{ success: boolean; error?: any }> {
        try {
            await this.client.del(key);
            return { success: true };
        } catch (err: any) {
            logger.error(`Failed to delete key "${key}" from cache: ${err}`);
            return { success: false, error: err };
        }
    }

    /**
     * Deletes multiple keys from the cache in a single round-trip.
     *
     * @param keys - Array of cache keys to delete.
     * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
     *
     * @example
     * await cache.deleteMany(["user:1", "user:2"]);
     */
    async deleteMany(keys: string[]): Promise<{ success: boolean; error?: any }> {
        try {
            await this.client.del(keys);
            return { success: true };
        } catch (err: any) {
            logger.error(`Failed to delete keys "${keys}" from cache: ${err}`);
            return { success: false, error: err };
        }
    }

    /**
     * Increments a numeric value stored at key by 1.
     * If the key does not exist, it is set to 1.
     *
     * @param key - The cache key to increment.
     * @returns The new value after increment, or -1 if the operation failed.
     *
     * @example
     * const newVal = await cache.incr("session:pairing-codes:counter");
     */
    async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (err: any) {
            logger.error(`Failed to increment key "${key}" in cache: ${err}`);
            return -1;
        }
    }

    /**
     * Flushes all keys from the Redis instance.
     * **Use with caution** — this clears the entire database, not just keys
     * set by this service.
     *
     * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
     *
     * @example
     * await cache.flush();
     */
    async flush(): Promise<{ success: boolean; error?: any }> {
        try {
            await this.client.flushAll();
            return { success: true };
        } catch (err: any) {
            logger.error(`Failed to flush cache: ${err}`);
            return { success: false, error: err };
        }
    }

    /**
     * Returns all keys currently stored in the cache.
     * Avoid using this in production on large datasets — `KEYS *` is an O(N)
     * blocking operation. Prefer `SCAN`-based iteration for large keyspaces.
     *
     * @returns An array of all cache keys, or an empty array if the operation failed.
     *
     * @example
     * const allKeys = await cache.keys();
     * // ["user:1", "user:2", "skus"]
     */
    async keys(): Promise<string[]> {
        try {
            const keys = await this.client.keys("*");
            return keys;
        } catch (err: any) {
            logger.error(`Failed to get keys from cache: ${err}`);
            return [];
        }
    }

    /**
     * Returns the remaining TTL (time-to-live) in seconds for a given key.
     *
     * Redis return values:
     * - `>= 0` — seconds remaining until expiry
     * - `-1` — key exists but has no expiry set
     * - `-2` — key does not exist
     *
     * @param key - The cache key to check.
     * @returns The TTL in seconds, or `-1` if the operation failed.
     *
     * @example
     * const ttl = await cache.ttl("user:42");
     * if (ttl === -2) console.log("Key does not exist");
     */
    async ttl(key: string): Promise<number> {
        try {
            const ttl = await this.client.ttl(key);
            return ttl;
        } catch (err: any) {
            logger.error(`Failed to get TTL for key "${key}" from cache: ${err}`);
            return -1;
        }
    }
}

export default new Cache();