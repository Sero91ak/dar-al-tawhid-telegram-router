import type { AppConfig } from "../config/env.js";
import type { MediaGroupRepository } from "../db/repositories/media-group-repository.js";
import type { SourcePostEnvelope } from "../types/domain.js";
import type { AppLogger } from "./logger.js";

export interface AlbumCarrier {
  chatId: string;
  mediaGroupId: string | null;
  messageId: number;
  captionOrText: string;
  payload: unknown;
}

export class MediaGroupService {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly flushDelayMs = 1200;

  public constructor(
    private readonly repo: MediaGroupRepository,
    private readonly logger: AppLogger,
    private readonly _config: Pick<AppConfig, "SOURCE_CHANNEL_ID">
  ) {}

  public async collect(input: AlbumCarrier): Promise<SourcePostEnvelope | null> {
    if (!input.mediaGroupId) {
      return {
        sourceChatId: input.chatId,
        sourceMessageId: input.messageId,
        sourceMessageIds: [input.messageId],
        mediaGroupId: null,
        captionOrText: input.captionOrText
      };
    }

    await this.repo.add({
      sourceChatId: input.chatId,
      mediaGroupId: input.mediaGroupId,
      sourceMessageId: input.messageId,
      captionOrText: input.captionOrText,
      payloadJson: JSON.stringify(input.payload)
    });

    return new Promise((resolve) => {
      const key = `${input.chatId}:${input.mediaGroupId}`;
      const existing = this.timers.get(key);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(async () => {
        this.timers.delete(key);
        const items = await this.repo.list(input.chatId, input.mediaGroupId ?? "");
        await this.repo.delete(input.chatId, input.mediaGroupId ?? "");
        const captionSource = items.find((item) => item.captionOrText.trim().length > 0) ?? items[0];

        this.logger.info(
          { mediaGroupId: input.mediaGroupId, count: items.length, sourceChatId: input.chatId },
          "media_group_flushed"
        );

        resolve({
          sourceChatId: input.chatId,
          sourceMessageId: items[0]?.sourceMessageId ?? input.messageId,
          sourceMessageIds: items.map((item) => item.sourceMessageId),
          mediaGroupId: input.mediaGroupId,
          captionOrText: captionSource?.captionOrText ?? ""
        });
      }, this.flushDelayMs);

      this.timers.set(key, timer);
    });
  }
}
