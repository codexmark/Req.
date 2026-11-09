import { createClient } from "redis";
import { Redis as UpstashRedis } from "@upstash/redis";

let redisClient;
let redisConnectPromise;
let upstashClient;
let lastRedisError;

const CONNECT_TIMEOUT_MS = 5000;

// O store faz JSON.parse por conta propria; o SDK da Upstash nao pode desserializar antes.
const UPSTASH_OPTIONS = { automaticDeserialization: false };

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
        ...UPSTASH_OPTIONS,
      });
    } else {
      upstashClient = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        ...UPSTASH_OPTIONS,
      });
    }
  }

  return upstashClient;
}

export async function getRedis() {
  if (hasRestRedis()) {
    return getUpstashClient();
  }

  if (hasTcpRedis()) {
    if (redisClient?.isOpen) {
      return redisClient;
    }

    if (redisClient && !redisConnectPromise) {
      // Conexao caiu depois de aberta: sem reconexao automatica, recria o cliente.
      try {
        redisClient.destroy();
      } catch {
        // cliente ja fechado
      }
      redisClient = null;
    }

    if (!redisClient) {
      redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: CONNECT_TIMEOUT_MS,
          // Sem reconexao automatica: se o host nao responde, a funcao
          // devolve 503 em segundos em vez de travar ate o timeout da Vercel.
          reconnectStrategy: false,
        },
      });
      redisClient.on("error", (error) => {
        lastRedisError = error;
        console.error("Redis error", error);
      });
    }

    if (!redisConnectPromise) {
      const client = redisClient;
      lastRedisError = null;
      redisConnectPromise = client
        .connect()
        .catch((error) => {
          // Descarta o cliente com falha para que a proxima invocacao tente de novo.
          redisClient = null;
          try {
            client.destroy();
          } catch {
            // cliente ja fechado
          }
          throw lastRedisError || error;
        })
        .finally(() => {
          redisConnectPromise = null;
        });
    }

    await redisConnectPromise;
    return redisClient;
  }

  throw new Error("No Redis configuration found. Expected REDIS_URL or Vercel KV/Upstash REST envs.");
}

export function getRedisMode() {
  if (hasRestRedis()) return "rest";
  if (hasTcpRedis()) return "tcp";
  return "none";
}
