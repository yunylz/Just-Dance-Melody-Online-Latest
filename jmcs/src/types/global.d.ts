import { RedisClientType } from "redis";

declare global {
    var redisClient: RedisClientType;
}

export {};