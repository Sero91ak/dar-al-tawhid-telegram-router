import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  SOURCE_CHANNEL_ID: z.coerce.bigint(),
  TARGET_FORUM_ID: z.coerce.bigint(),
  ADMIN_USER_IDS: z.string().min(1),
  ROUTING_MODE: z.enum(["forward", "copy"]).default("forward"),
  WEBHOOK_SECRET: z.string().min(12),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_WEB_USERNAME: z.string().optional(),
  ADMIN_WEB_PASSWORD: z.string().optional()
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);

  const adminUserIds = parsed.ADMIN_USER_IDS.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => BigInt(part));

  return {
    ...parsed,
    adminUserIds
  };
}
