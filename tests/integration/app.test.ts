import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("app integration", () => {
  let instance: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    instance = await createApp({
      TELEGRAM_BOT_TOKEN: "123456:abcdefghijklmnopqrstuvwxyz",
      SOURCE_CHANNEL_ID: "-1001",
      TARGET_FORUM_ID: "-2002",
      ADMIN_USER_IDS: "7,8",
      ROUTING_MODE: "forward",
      WEBHOOK_SECRET: "super-secret-token",
      DATABASE_URL: "sqlite::memory:",
      PORT: "3000",
      LOG_LEVEL: "fatal",
      NODE_ENV: "test",
      ADMIN_WEB_USERNAME: "admin",
      ADMIN_WEB_PASSWORD: "secretsecret"
    });
  });

  afterEach(async () => {
    if (instance) {
      await instance.app.close();
    }
  });

  it("serves health", async () => {
    const response = await instance.app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("ok");
  });

  it("protects admin route", async () => {
    const response = await instance.app.inject({ method: "GET", url: "/admin" });
    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid webhook secret", async () => {
    const response = await instance.app.inject({
      method: "POST",
      url: "/telegram/webhook",
      headers: {
        "x-telegram-bot-api-secret-token": "wrong-secret"
      },
      payload: {}
    });
    expect(response.statusCode).toBe(401);
  });
});
