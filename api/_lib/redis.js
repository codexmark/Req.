import { createClient } from "redis";

let redisClient;
let redisConnectPromise;

export async function getRedis() {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured");
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
