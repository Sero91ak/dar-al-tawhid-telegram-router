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
        resolve(await this.flushGroup(input.chatId, input.mediaGroupId ?? ""));
      }, this.flushDelayMs);

      this.timers.set(key, timer);
    });
  }

  public async recoverPendingGroups(): Promise<SourcePostEnvelope[]> {
    const groups = await this.repo.listPendingGroups();
    const envelopes: SourcePostEnvelope[] = [];

    for (const group of groups) {
      const key = `${group.sourceChatId}:${group.mediaGroupId}`;
      const activeTimer = this.timers.get(key);
      if (activeTimer) {
        clearTimeout(activeTimer);
        this.timers.delete(key);
      }

      const envelope = await this.flushGroup(group.sourceChatId, group.mediaGroupId);
      if (envelope) {
        envelopes.push(envelope);
      }
    }

    return envelopes;
  }

  private async flushGroup(sourceChatId: string, mediaGroupId: string): Promise<SourcePostEnvelope | null> {
    const items = await this.repo.list(sourceChatId, mediaGroupId);
    if (items.length === 0) {
      return null;
    }

    await this.repo.delete(sourceChatId, mediaGroupId);
    const captionSource = items.find((item) => item.captionOrText.trim().length > 0) ?? items[0];

    this.logger.info(
      { mediaGroupId, count: items.length, sourceChatId },
      "media_group_flushed"
    );

    return {
      sourceChatId,
      sourceMessageId: items[0]?.sourceMessageId ?? 0,
      sourceMessageIds: items.map((item) => item.sourceMessageId),
      mediaGroupId,
      captionOrText: captionSource?.captionOrText ?? ""
    };
  }
}
