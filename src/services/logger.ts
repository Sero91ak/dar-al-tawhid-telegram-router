import pino from "pino";
import type { AppConfig } from "../config/env.js";

const secretKeys = ["TELEGRAM_BOT_TOKEN", "WEBHOOK_SECRET", "ADMIN_WEB_PASSWORD"];

export interface AppLogger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
}

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL" | "NODE_ENV">) {
  const options: Parameters<typeof pino>[0] = {
    level: config.LOG_LEVEL,
    redact: {
      paths: secretKeys,
      censor: "[REDACTED]"
    }
  };

  if (config.NODE_ENV === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true
      }
    };
  }

  return pino(options);
}
