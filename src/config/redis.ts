import { Redis } from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "./env.js";

export const connection = new Redis({
  host: REDIS_HOST!,
  port: Number(REDIS_PORT),
  maxRetriesPerRequest: null,
});
