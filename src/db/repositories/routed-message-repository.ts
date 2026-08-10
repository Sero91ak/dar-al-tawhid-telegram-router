import type { Kysely } from "kysely";
import type { RoutingCategory } from "../../config/routing.js";
import type { DatabaseSchema } from "../schema.js";

export class RoutedMessageRepository {
  public constructor(private readonly db: Kysely<DatabaseSchema>) {}

  public async hasSuccessfulRoute(input: {
    sourceChatId: string;
    sourceMessageId: number;
    destinationChatId: string;
    destinationThreadId: number;
    category: RoutingCategory;
  }): Promise<boolean> {
    const row = await this.db
      .selectFrom("routed_messages")
      .select("id")
      .where("source_chat_id", "=", input.sourceChatId)
      .where("source_message_id", "=", input.sourceMessageId)
      .where("destination_chat_id", "=", input.destinationChatId)
      .where("destination_thread_id", "=", input.destinationThreadId)
      .where("routing_category", "=", input.category)
      .where("status", "=", "success")
      .executeTakeFirst();

    return Boolean(row);
  }

  public async recordResult(input: {
    sourceChatId: string;
    sourceMessageId: number;
    sourceMessageIds: number[];
    destinationChatId: string;
    destinationThreadId: number;
    category: RoutingCategory;
    mediaGroupId: string | null;
    routingMode: "forward" | "copy";
    status: "pending" | "success" | "failed" | "skipped";
    telegramDestinationMessageId?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    await this.db
      .insertInto("routed_messages")
      .values({
        source_chat_id: input.sourceChatId,
        source_message_id: input.sourceMessageId,
        source_message_ids_json: JSON.stringify(input.sourceMessageIds),
        destination_chat_id: input.destinationChatId,
        destination_thread_id: input.destinationThreadId,
        routing_category: input.category,
        media_group_id: input.mediaGroupId,
        routing_mode: input.routingMode,
        status: input.status,
        telegram_destination_message_id: input.telegramDestinationMessageId ?? null,
        error_code: input.errorCode ?? null,
        error_message: input.errorMessage ?? null
      })
      .onConflict((oc) =>
        oc.columns([
          "source_chat_id",
          "source_message_id",
          "destination_chat_id",
          "destination_thread_id",
          "routing_category"
        ]).doUpdateSet({
          source_message_ids_json: JSON.stringify(input.sourceMessageIds),
          media_group_id: input.mediaGroupId,
          routing_mode: input.routingMode,
          status: input.status,
          telegram_destination_message_id: input.telegramDestinationMessageId ?? null,
          error_code: input.errorCode ?? null,
          error_message: input.errorMessage ?? null,
          updated_at: new Date().toISOString()
        })
      )
      .execute();
  }

  public async latestSuccess(): Promise<{ sourceMessageId: number; updatedAt: string } | null> {
    const row = await this.db
      .selectFrom("routed_messages")
      .select(["source_message_id as sourceMessageId", "updated_at as updatedAt"])
      .where("status", "=", "success")
      .orderBy("updated_at", "desc")
      .executeTakeFirst();
    return row ?? null;
  }
}
