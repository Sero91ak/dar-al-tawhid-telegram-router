import { CATEGORY_KEYS, ROUTE_DEFINITIONS, type RoutingCategory } from "../config/routing.js";
import type { AppConfig } from "../config/env.js";
import type { AppStateRepository } from "../db/repositories/app-state-repository.js";
import type { ErrorLogRepository } from "../db/repositories/error-log-repository.js";
import type { RoutedMessageRepository } from "../db/repositories/routed-message-repository.js";
import type { TopicRegistryService } from "../services/topic-registry-service.js";
import type { AppLogger } from "../services/logger.js";

export interface CommandContext {
  userId: number | undefined;
  chatId: string;
  threadId: number | undefined;
  text: string;
  reply: (text: string) => Promise<unknown>;
}

export class CommandService {
  public constructor(
    private readonly deps: {
      config: AppConfig;
      topicRegistry: TopicRegistryService;
      routedMessages: RoutedMessageRepository;
      appState: AppStateRepository;
      errorLog: ErrorLogRepository;
      logger: AppLogger;
    }
  ) {}

  public async handleHelp(ctx: CommandContext) {
    await ctx.reply(
      [
        "DAR AL TAWḤĪD Telegram Router",
        "",
        "/register <bereich> – aktuelles Forum-Thema registrieren",
        "/unregister <bereich> – Thema-Zuordnung entfernen",
        "/status – Systemstatus",
        "/routes – Routing-Tabelle",
        "/test – sichere Funktionsprüfung",
        "/help – diese Hilfe"
      ].join("\n")
    );
  }

  public async handleRegister(ctx: CommandContext): Promise<void> {
    const category = parseCategory(ctx.text);
    if (!category) {
      await ctx.reply("Ungültiger Bereich. Erlaubt: " + CATEGORY_KEYS.join(", "));
      return;
    }

    if (ctx.chatId !== String(this.deps.config.TARGET_FORUM_ID)) {
      await ctx.reply("Dieser Befehl ist nur in der konfigurierten Ziel-Forumgruppe erlaubt.");
      return;
    }

    if (!ctx.threadId) {
      await ctx.reply("Dieser Befehl muss innerhalb eines Forum-Themas verwendet werden.");
      return;
    }

    await this.deps.topicRegistry.register({
      category,
      targetForumId: ctx.chatId,
      threadId: ctx.threadId,
      adminUserId: String(ctx.userId)
    });
    await ctx.reply(`Thema für ${category} registriert (Thread-ID ${ctx.threadId}).`);
  }

  public async handleUnregister(ctx: CommandContext): Promise<void> {
    const category = parseCategory(ctx.text);
    if (!category) {
      await ctx.reply("Ungültiger Bereich. Erlaubt: " + CATEGORY_KEYS.join(", "));
      return;
    }

    await this.deps.topicRegistry.unregister(category);
    await ctx.reply(`Thema für ${category} wurde entfernt.`);
  }

  public async handleRoutes(ctx: CommandContext): Promise<void> {
    const routes = await this.deps.topicRegistry.list();
    const lines = ROUTE_DEFINITIONS.map((route) => {
      const current = routes.find((item) => item.category === route.category);
      return [
        route.title,
        `Hashtags: ${route.hashtags.map((tag) => `#${tag}`).join(", ")}`,
        current ? `Thread-ID: ${current.threadId} (${current.targetForumId})` : "Thread-ID: nicht registriert"
      ].join("\n");
    });

    await ctx.reply(lines.join("\n\n"));
  }

  public async handleStatus(ctx: CommandContext): Promise<void> {
    const routes = await this.deps.topicRegistry.list();
    const lastRouting = await this.deps.appState.getJson<{
      sourceMessageId: number;
      categories: RoutingCategory[];
      successes: RoutingCategory[];
      failures: Array<{ category: RoutingCategory; error: string }>;
      at: string;
    }>("last-routing-status");
    const latestSuccess = await this.deps.routedMessages.latestSuccess();
    const latestError = await this.deps.errorLog.latest();

    const registered = routes.map((route) => route.category);
    const missing = CATEGORY_KEYS.filter((item) => !registered.includes(item));

    await ctx.reply(
      [
        "Bot: aktiv",
        `Quellkanal: ${this.deps.config.SOURCE_CHANNEL_ID}`,
        `Ziel-Forum: ${this.deps.config.TARGET_FORUM_ID}`,
        `Routing-Modus: ${this.deps.config.ROUTING_MODE}`,
        `Registriert: ${registered.join(", ") || "keine"}`,
        `Fehlend: ${missing.join(", ") || "keine"}`,
        `Letzter erfolgreicher Routing-Vorgang: ${latestSuccess ? `${latestSuccess.sourceMessageId} (${latestSuccess.updatedAt})` : "keiner"}`,
        `Letzter verarbeiteter Hauptkanal-Post: ${lastRouting ? `${lastRouting.sourceMessageId} (${lastRouting.at})` : "keiner"}`,
        `Letzter Fehler: ${latestError ? `${latestError.code} – ${latestError.message}` : "kein Fehler"}`
      ].join("\n")
    );
  }

  public async handleTest(ctx: CommandContext): Promise<void> {
    const routes = await this.deps.topicRegistry.list();
    await ctx.reply(
      `Sicherer Test: ${routes.length} registrierte Topics, Modus ${this.deps.config.ROUTING_MODE}. Kein echter Channel-Post wurde vervielfältigt.`
    );
  }
}

function parseCategory(commandText: string): RoutingCategory | null {
  const part = commandText.split(/\s+/)[1]?.trim().toLowerCase();
  if (!part) {
    return null;
  }

  return CATEGORY_KEYS.includes(part as RoutingCategory) ? (part as RoutingCategory) : null;
}
