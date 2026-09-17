import { createClient, RedisClientType } from "redis";
import { createLogger } from "../logger";

const logger = createLogger({ service: "redis-client" });

let instance: RedisClientType | null = null;

export async function connectRedis(
    url: string
): Promise<RedisClientType> {
    const client = createClient({
        url
    }) as RedisClientType;

    client.on("error", (err: any) => {
        logger.error("Redis error:", err);
    });

    client.on("ready", () => {
        logger.info("Redis is ready!");
    });

    await client.connect();
    instance = client;
    return client;
}

export function getRedisClient(): RedisClientType {
    if (!instance) {
        throw new Error("[redis] Client not initialized. Call connectRedis() first.");
    }
    return instance;
}