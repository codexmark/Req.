import { createClient } from "redis";
import { Redis as UpstashRedis } from "@upstash/redis";

let redisClient;
let redisConnectPromise;
let upstashClient;

function hasTcpRedis() {
  return Boolean(process.env.REDIS_URL);
}

function hasRestRedis() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

function getUpstashClient() {
  if (!upstashClient) {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      upstashClient = new UpstashRedis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    } else {
      upstashClient = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
  }

  return upstashClient;
}

export async function getRedis() {
  if (hasTcpRedis()) {
    if (redisClient?.isOpen) {
      return redisClient;
    }

    if (!redisClient) {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on("error", (error) => {
        console.error("Redis error", error);
      });
    }

    if (!redisConnectPromise) {
      redisConnectPromise = redisClient.connect().finally(() => {
        redisConnectPromise = null;
      });
    }

    await redisConnectPromise;
    return redisClient;
  }

  if (hasRestRedis()) {
    return getUpstashClient();
  }

  throw new Error("No Redis configuration found. Expected REDIS_URL or Vercel KV/Upstash REST envs.");
}
