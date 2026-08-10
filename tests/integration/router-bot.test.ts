import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouterBot } from "../../src/bot/router-bot.js";
import type { AppConfig } from "../../src/config/env.js";
import type { AppLogger } from "../../src/services/logger.js";

function createConfig(): AppConfig {
  return {
    TELEGRAM_BOT_TOKEN: "123456:abcdefghijklmnopqrstuvwxyz",
    SOURCE_CHANNEL_ID: BigInt(-1001),
    TARGET_FORUM_ID: BigInt(-2002),
    ADMIN_USER_IDS: "7,8",
    ROUTING_MODE: "forward",
    WEBHOOK_SECRET: "super-secret-token",
    DATABASE_URL: "sqlite::memory:",
    PORT: 3000,
    LOG_LEVEL: "fatal",
    NODE_ENV: "test",
    ADMIN_WEB_USERNAME: "admin",
    ADMIN_WEB_PASSWORD: "secretsecret",
    PUBLIC_BASE_URL: undefined,
    adminUserIds: [BigInt(7), BigInt(8)]
  };
}

function createLogger(): AppLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
}

function initializeTestBot<T extends ReturnType<typeof createRouterBot>>(bot: T): T {
  bot.botInfo = {
    id: 123456,
    is_bot: true,
    first_name: "DAR Router",
    username: "dar_router_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false
  };
  return bot;
}

describe("router bot", () => {
  const routingService = { routeSourcePost: vi.fn() };
  const mediaGroupService = { collect: vi.fn() };
  const commandService = {
    handleHelp: vi.fn(),
    handleRegister: vi.fn(),
    handleUnregister: vi.fn(),
    handleStatus: vi.fn(),
    handleRoutes: vi.fn(),
    handleTest: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mediaGroupService.collect.mockResolvedValue({
      sourceChatId: "-1001",
      sourceMessageId: 1,
      sourceMessageIds: [1],
      mediaGroupId: null,
      captionOrText: "#Aqidah"
    });
  });

  it("ignores posts from other channels", async () => {
    const bot = initializeTestBot(createRouterBot({
      config: createConfig(),
      logger: createLogger(),
      commandService,
      mediaGroupService,
      routingService
    }));

    await bot.handleUpdate({
      update_id: 1,
      channel_post: {
        message_id: 99,
        date: 1,
        chat: { id: -9999, type: "channel", title: "Other" },
        text: "#Aqidah"
      }
    });

    expect(mediaGroupService.collect).not.toHaveBeenCalled();
    expect(routingService.routeSourcePost).not.toHaveBeenCalled();
  });

  it("routes valid source channel posts", async () => {
    const bot = initializeTestBot(createRouterBot({
      config: createConfig(),
      logger: createLogger(),
      commandService,
      mediaGroupService,
      routingService
    }));

    await bot.handleUpdate({
      update_id: 2,
      channel_post: {
        message_id: 100,
        date: 1,
        chat: { id: -1001, type: "channel", title: "DAR AL TAWḤĪD" },
        text: "#Aqidah"
      }
    });

    expect(mediaGroupService.collect).toHaveBeenCalledOnce();
    expect(routingService.routeSourcePost).toHaveBeenCalledOnce();
  });

  it("rejects register for non-admin users", async () => {
    const bot = initializeTestBot(createRouterBot({
      config: createConfig(),
      logger: createLogger(),
      commandService,
      mediaGroupService,
      routingService
    }));

    await bot.handleUpdate({
      update_id: 3,
      message: {
        message_id: 1,
        date: 1,
        chat: { id: -2002, type: "supergroup", title: "Forum", is_forum: true },
        from: { id: 999, is_bot: false, first_name: "User" },
        text: "/register aqidah",
        entities: [{ offset: 0, length: 17, type: "bot_command" }],
        message_thread_id: 77
      }
    });

    expect(commandService.handleRegister).not.toHaveBeenCalled();
  });
});
