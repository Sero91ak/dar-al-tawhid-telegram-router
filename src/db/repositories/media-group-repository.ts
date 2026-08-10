import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../schema.js";

export interface StoredMediaGroupItem {
  sourceChatId: string;
  mediaGroupId: string;
  sourceMessageId: number;
  captionOrText: string;
  payloadJson: string;
}

export interface PendingMediaGroup {
  sourceChatId: string;
  mediaGroupId: string;
}

export class MediaGroupRepository {
  public constructor(private readonly db: Kysely<DatabaseSchema>) {}

  public async add(item: StoredMediaGroupItem): Promise<void> {
    await this.db
      .insertInto("media_group_items")
      .values({
        source_chat_id: item.sourceChatId,
        media_group_id: item.mediaGroupId,
        source_message_id: item.sourceMessageId,
        caption_or_text: item.captionOrText,
        payload_json: item.payloadJson
      })
      .onConflict((oc) =>
        oc.columns(["source_chat_id", "media_group_id", "source_message_id"]).doNothing()
      )
      .execute();
  }

  public async list(sourceChatId: string, mediaGroupId: string): Promise<StoredMediaGroupItem[]> {
    const rows = await this.db
      .selectFrom("media_group_items")
      .selectAll()
      .where("source_chat_id", "=", sourceChatId)
      .where("media_group_id", "=", mediaGroupId)
      .orderBy("source_message_id")
      .execute();

    return rows.map((row) => ({
      sourceChatId: row.source_chat_id,
      mediaGroupId: row.media_group_id,
      sourceMessageId: row.source_message_id,
      captionOrText: row.caption_or_text,
      payloadJson: row.payload_json
    }));
  }

  public async delete(sourceChatId: string, mediaGroupId: string): Promise<void> {
    await this.db
      .deleteFrom("media_group_items")
      .where("source_chat_id", "=", sourceChatId)
      .where("media_group_id", "=", mediaGroupId)
      .execute();
  }

  public async listPendingGroups(): Promise<PendingMediaGroup[]> {
    const rows = await this.db
      .selectFrom("media_group_items")
      .select(["source_chat_id as sourceChatId", "media_group_id as mediaGroupId"])
      .distinct()
      .execute();

    return rows;
  }
}
