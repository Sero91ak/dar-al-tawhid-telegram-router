import { ROUTE_DEFINITIONS, type RoutingCategory } from "../config/routing.js";
import type { AppStateRepository } from "../db/repositories/app-state-repository.js";
import type { ErrorLogRepository } from "../db/repositories/error-log-repository.js";
import type { RoutedMessageRepository } from "../db/repositories/routed-message-repository.js";
import type { TopicRouteRepository } from "../db/repositories/topic-route-repository.js";
import { decideRouting } from "../bot/router/hashtag-parser.js";
import type { SourcePostEnvelope } from "../types/domain.js";
import type { TelegramGateway } from "./telegram-gateway.js";
import { isRetryableTelegramError } from "./telegram-gateway.js";
import type { AppLogger } from "./logger.js";

export interface RoutingServiceDeps {
  topicRoutes: TopicRouteRepository;
  routedMessages: RoutedMessageRepository;
  appState: AppStateRepository;
  errorLog: ErrorLogRepository;
  telegram: TelegramGateway;
  logger: AppLogger;
  targetForumId: string;
  routingMode: "forward" | "copy";
  retryAttempts?: number;
}

export class RoutingService {
  private readonly retryAttempts: number;

  public constructor(private readonly deps: RoutingServiceDeps) {
    this.retryAttempts = Math.max(1, deps.retryAttempts ?? 3);
  }

  public async routeSourcePost(envelope: SourcePostEnvelope): Promise<{
    categories: RoutingCategory[];
    successes: RoutingCategory[];
    failures: Array<{ category: RoutingCategory; error: string }>;
  }> {
    const decision = decideRouting(envelope.captionOrText);
    this.deps.logger.info(
      {
        sourceChatId: envelope.sourceChatId,
        sourceMessageId: envelope.sourceMessageId,
        hashtags: decision.hashtags.map((tag) => tag.raw),
        categories: decision.categories
      },
      "routing_decision"
    );

    if (decision.categories.length === 0) {
      await this.deps.errorLog.add("no-routing-hashtag", "Kein Routing-Hashtag erkannt.", {
        sourceChatId: envelope.sourceChatId,
        sourceMessageId: envelope.sourceMessageId
      });
      return { categories: [], successes: [], failures: [] };
    }

    const successes: RoutingCategory[] = [];
    const failures: Array<{ category: RoutingCategory; error: string }> = [];

    for (const category of decision.categories) {
      const route = await this.deps.topicRoutes.find(category);
      if (!route) {
        const error = `${category} route not registered`;
        failures.push({ category, error });
        await this.deps.errorLog.add("missing-topic-route", "Ziel-Topic ist nicht registriert.", {
          category,
          sourceMessageId: envelope.sourceMessageId
        });
        continue;
      }

      const alreadySent = await this.deps.routedMessages.hasSuccessfulRoute({
        sourceChatId: envelope.sourceChatId,
        sourceMessageId: envelope.sourceMessageId,
        destinationChatId: route.targetForumId,
        destinationThreadId: route.threadId,
        category
      });

      if (alreadySent) {
        this.deps.logger.info({ category, sourceMessageId: envelope.sourceMessageId }, "duplicate_route_skipped");
        continue;
      }

      try {
        const destinationMessageId = await this.sendToRouteWithRetry({
          route,
          sourceChatId: envelope.sourceChatId,
          sourceMessageIds: envelope.sourceMessageIds
        });

        await this.deps.routedMessages.recordResult({
          sourceChatId: envelope.sourceChatId,
          sourceMessageId: envelope.sourceMessageId,
          sourceMessageIds: envelope.sourceMessageIds,
          destinationChatId: route.targetForumId,
          destinationThreadId: route.threadId,
          category,
          mediaGroupId: envelope.mediaGroupId,
          routingMode: this.deps.routingMode,
          status: "success",
          telegramDestinationMessageId: destinationMessageId
        });

        successes.push(category);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown routing error";
        const retryMeta = isRetryableTelegramError(error);

        await this.deps.routedMessages.recordResult({
          sourceChatId: envelope.sourceChatId,
          sourceMessageId: envelope.sourceMessageId,
          sourceMessageIds: envelope.sourceMessageIds,
          destinationChatId: route.targetForumId,
          destinationThreadId: route.threadId,
          category,
          mediaGroupId: envelope.mediaGroupId,
          routingMode: this.deps.routingMode,
          status: "failed",
          errorCode: retryMeta.code ? String(retryMeta.code) : null,
          errorMessage: message
        });

        await this.deps.errorLog.add("routing-failed", message, {
          category,
          retryAfterSeconds: retryMeta.retryAfterSeconds,
          sourceMessageId: envelope.sourceMessageId
        });
        failures.push({ category, error: message });
      }
    }

    await this.deps.appState.setJson("last-routing-status", {
      sourceMessageId: envelope.sourceMessageId,
      sourceChatId: envelope.sourceChatId,
      categories: decision.categories,
      successes,
      failures,
      at: new Date().toISOString()
    });

    return { categories: decision.categories, successes, failures };
  }

  public getRoutesSummary() {
    return ROUTE_DEFINITIONS;
  }

  private async sendToRoute(input: {
    route: { targetForumId: string; threadId: number };
    sourceChatId: string;
    sourceMessageIds: number[];
  }): Promise<number | null> {
    const primaryMessageId = input.sourceMessageIds[0];
    if (primaryMessageId === undefined) {
      throw new Error("No source message id available");
    }

    const isAlbum = input.sourceMessageIds.length > 1;
    if (this.deps.routingMode === "forward") {
      return isAlbum
        ? this.deps.telegram.forwardAlbum({
            fromChatId: input.sourceChatId,
            toChatId: input.route.targetForumId,
            threadId: input.route.threadId,
            messageIds: input.sourceMessageIds
          })
        : this.deps.telegram.forwardSingle({
            fromChatId: input.sourceChatId,
            toChatId: input.route.targetForumId,
            threadId: input.route.threadId,
            messageId: primaryMessageId
          });
    }

    return isAlbum
      ? this.deps.telegram.copyAlbum({
          fromChatId: input.sourceChatId,
          toChatId: input.route.targetForumId,
          threadId: input.route.threadId,
          messageIds: input.sourceMessageIds
        })
      : this.deps.telegram.copySingle({
          fromChatId: input.sourceChatId,
          toChatId: input.route.targetForumId,
          threadId: input.route.threadId,
          messageId: primaryMessageId
        });
  }

  private async sendToRouteWithRetry(input: {
    route: { targetForumId: string; threadId: number };
    sourceChatId: string;
    sourceMessageIds: number[];
  }): Promise<number | null> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.retryAttempts) {
      attempt += 1;

      try {
        return await this.sendToRoute(input);
      } catch (error) {
        lastError = error;
        const retryMeta = isRetryableTelegramError(error);
        const canRetry =
          retryMeta.retryAfterSeconds !== null ||
          retryMeta.code === 429 ||
          (retryMeta.code !== null && retryMeta.code >= 500);

        if (!canRetry || attempt >= this.retryAttempts) {
          throw error;
        }

        const delayMs = retryMeta.retryAfterSeconds
          ? retryMeta.retryAfterSeconds * 1000
          : Math.min(250 * attempt, 1000);

        this.deps.logger.warn(
          {
            attempt,
            delayMs,
            sourceChatId: input.sourceChatId,
            destinationThreadId: input.route.threadId
          },
          "telegram_route_retry"
        );

        await sleep(delayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("routing failed after retries");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
