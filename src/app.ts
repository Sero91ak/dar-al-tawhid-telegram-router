import fastify from "fastify";
import basicAuth from "@fastify/basic-auth";
import { webhookCallback } from "grammy";
import { loadConfig } from "./config/env.js";
import { createDatabase } from "./db/index.js";
import { AppStateRepository } from "./db/repositories/app-state-repository.js";
import { ErrorLogRepository } from "./db/repositories/error-log-repository.js";
import { MediaGroupRepository } from "./db/repositories/media-group-repository.js";
import { RoutedMessageRepository } from "./db/repositories/routed-message-repository.js";
import { TopicRouteRepository } from "./db/repositories/topic-route-repository.js";
import { CommandService } from "./bot/command-service.js";
import { createRouterBot } from "./bot/router-bot.js";
import { MediaGroupService } from "./services/media-group-service.js";
import { RoutingService } from "./services/routing-service.js";
import { TopicRegistryService } from "./services/topic-registry-service.js";
import { GrammyTelegramGateway } from "./services/telegram-gateway.js";
import { createLogger } from "./services/logger.js";
import { renderAdminHtml } from "./web/admin-view.js";

export async function createApp(env: NodeJS.ProcessEnv = process.env) {
  const config = loadConfig(env);
  const logger = createLogger(config);
  const database = await createDatabase(config);

  const topicRoutes = new TopicRouteRepository(database.db);
  const routedMessages = new RoutedMessageRepository(database.db);
  const appState = new AppStateRepository(database.db);
  const errorLog = new ErrorLogRepository(database.db);
  const mediaGroups = new MediaGroupRepository(database.db);
  const topicRegistry = new TopicRegistryService(topicRoutes);
  const telegram = new GrammyTelegramGateway(config);
  const commandService = new CommandService({
    config,
    topicRegistry,
    routedMessages,
    appState,
    errorLog,
    logger
  });
  const mediaGroupService = new MediaGroupService(mediaGroups, logger, config);
  const routingService = new RoutingService({
    topicRoutes,
    routedMessages,
    appState,
    errorLog,
    telegram,
    logger,
    targetForumId: String(config.TARGET_FORUM_ID),
    routingMode: config.ROUTING_MODE
  });

  const bot = createRouterBot({
    config,
    logger,
    commandService,
    mediaGroupService,
    routingService
  });

  const app = fastify({ logger: false });

  await app.register(basicAuth, {
    validate: async (username, password) => {
      if (!config.ADMIN_WEB_USERNAME || !config.ADMIN_WEB_PASSWORD) {
        throw new Error("Admin web auth not configured");
      }

      if (username !== config.ADMIN_WEB_USERNAME || password !== config.ADMIN_WEB_PASSWORD) {
        throw new Error("Unauthorized");
      }
    },
    authenticate: { realm: "DAR AL TAWḤĪD Telegram Router" }
  });

  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
    database: "connected",
    telegramConfigLoaded: true,
    timestamp: new Date().toISOString()
  }));

  app.post("/telegram/webhook", async (request, reply) => {
    const header = request.headers["x-telegram-bot-api-secret-token"];
    if (header !== config.WEBHOOK_SECRET) {
      reply.code(401);
      return { ok: false };
    }

    await webhookCallback(bot, "fastify")(request, reply);
    return reply;
  });

  app.get("/admin", { preHandler: app.basicAuth }, async (_request, reply) => {
    const me = await telegram.getMe().catch(() => null);
    const routes = await topicRegistry.list();
    const lastRouting = await appState.getJson<{
      sourceMessageId: number;
      categories: string[];
      successes: string[];
      at: string;
    }>("last-routing-status");

    const html = renderAdminHtml({
      botStatus: "aktiv",
      telegramStatus: me ? "verbunden" : "fehler",
      sourceConfigured: Boolean(config.SOURCE_CHANNEL_ID),
      targetConfigured: Boolean(config.TARGET_FORUM_ID),
      routes,
      activity: lastRouting
        ? [
            {
              when: lastRouting.at,
              sourceMessageId: lastRouting.sourceMessageId,
              categories: lastRouting.categories,
              result: `erfolgreich: ${lastRouting.successes.join(", ") || "keine"}`
            }
          ]
        : []
    });
    reply.type("text/html");
    return html;
  });

  app.addHook("onClose", async () => {
    await database.destroy();
  });

  return { app, config, bot, database };
}
