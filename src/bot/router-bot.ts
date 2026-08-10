import { Bot, type Context, GrammyError, HttpError } from "grammy";
import { isAdmin } from "./admin-auth.js";
import type { AppConfig } from "../config/env.js";
import type { CommandService } from "./command-service.js";
import type { MediaGroupService } from "../services/media-group-service.js";
import type { RoutingService } from "../services/routing-service.js";
import type { AppLogger } from "../services/logger.js";

export interface RouterBotDeps {
  config: AppConfig;
  logger: AppLogger;
  commandService: CommandService;
  mediaGroupService: MediaGroupService;
  routingService: RoutingService;
}

export function createRouterBot(deps: RouterBotDeps) {
  const bot = new Bot(deps.config.TELEGRAM_BOT_TOKEN);

  bot.catch((error) => {
    const ctx = error.ctx;
    deps.logger.error({ updateId: ctx.update.update_id, error }, "bot_error");
    if (error.error instanceof GrammyError) {
      deps.logger.error({ description: error.error.description }, "telegram_api_error");
    } else if (error.error instanceof HttpError) {
      deps.logger.error({ message: error.error.message }, "telegram_http_error");
    }
  });

  const adminOnly = async (ctx: Context, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    if (!isAdmin(userId, deps.config.adminUserIds)) {
      await ctx.reply("Nicht autorisiert.");
      return;
    }

    await next();
  };

  bot.command("help", adminOnly, async (ctx) => {
    await deps.commandService.handleHelp({
      userId: ctx.from?.id,
      chatId: String(ctx.chat.id),
      threadId: ctx.message?.message_thread_id,
      text: ctx.message?.text ?? "/help",
      reply: (text) => ctx.reply(text)
    });
  });

  bot.command(["register", "unregister", "status", "routes", "test"], adminOnly, async (ctx) => {
    const text = ctx.message?.text ?? "";
    const command = text.split(/\s+/)[0]?.replace(/^\//, "").split("@")[0];
    const commandCtx = {
      userId: ctx.from?.id,
      chatId: String(ctx.chat.id),
      threadId: ctx.message?.message_thread_id,
      text,
      reply: (replyText: string) => ctx.reply(replyText)
    };

    switch (command) {
      case "register":
        await deps.commandService.handleRegister(commandCtx);
        return;
      case "unregister":
        await deps.commandService.handleUnregister(commandCtx);
        return;
      case "status":
        await deps.commandService.handleStatus(commandCtx);
        return;
      case "routes":
        await deps.commandService.handleRoutes(commandCtx);
        return;
      case "test":
        await deps.commandService.handleTest(commandCtx);
        return;
      default:
        await deps.commandService.handleHelp(commandCtx);
    }
  });

  bot.on("channel_post", async (ctx) => {
    if (BigInt(ctx.channelPost.chat.id) !== deps.config.SOURCE_CHANNEL_ID) {
      deps.logger.info({ chatId: ctx.channelPost.chat.id }, "channel_post_ignored_wrong_source");
      return;
    }

    const captionOrText = ctx.channelPost.caption ?? ctx.channelPost.text ?? "";
    const envelope = await deps.mediaGroupService.collect({
      chatId: String(ctx.channelPost.chat.id),
      mediaGroupId: ctx.channelPost.media_group_id ?? null,
      messageId: ctx.channelPost.message_id,
      captionOrText,
      payload: ctx.channelPost
    });

    if (!envelope) {
      return;
    }

    await deps.routingService.routeSourcePost(envelope);
  });

  return bot;
}
