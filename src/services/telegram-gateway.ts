import { Api, GrammyError } from "grammy";
import type { AppConfig } from "../config/env.js";

export interface TelegramGateway {
  getMe(): Promise<{ username?: string }>;
  forwardSingle(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageId: number;
  }): Promise<number>;
  copySingle(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageId: number;
  }): Promise<number>;
  forwardAlbum(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageIds: number[];
  }): Promise<number | null>;
  copyAlbum(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageIds: number[];
  }): Promise<number | null>;
}

export class GrammyTelegramGateway implements TelegramGateway {
  private readonly api: Api;

  public constructor(config: Pick<AppConfig, "TELEGRAM_BOT_TOKEN">) {
    this.api = new Api(config.TELEGRAM_BOT_TOKEN);
  }

  public async getMe() {
    return this.api.getMe();
  }

  public async forwardSingle(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageId: number;
  }): Promise<number> {
    const message = await this.api.forwardMessage(params.toChatId, params.fromChatId, params.messageId, {
      message_thread_id: params.threadId
    });
    return message.message_id;
  }

  public async copySingle(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageId: number;
  }): Promise<number> {
    const messageId = await this.api.copyMessage(params.toChatId, params.fromChatId, params.messageId, {
      message_thread_id: params.threadId
    });
    return messageId.message_id;
  }

  public async forwardAlbum(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageIds: number[];
  }): Promise<number | null> {
    if (params.messageIds.length === 0) {
      return null;
    }

    const result = await this.api.raw.forwardMessages({
      from_chat_id: params.fromChatId,
      chat_id: params.toChatId,
      message_ids: params.messageIds,
      message_thread_id: params.threadId
    });

    const first = Array.isArray(result) ? result[0] : undefined;
    return first?.message_id ?? null;
  }

  public async copyAlbum(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageIds: number[];
  }): Promise<number | null> {
    if (params.messageIds.length === 0) {
      return null;
    }

    const result = await this.api.raw.copyMessages({
      from_chat_id: params.fromChatId,
      chat_id: params.toChatId,
      message_ids: params.messageIds,
      message_thread_id: params.threadId
    });

    const first = Array.isArray(result) ? result[0] : undefined;
    return first?.message_id ?? null;
  }
}

export function isRetryableTelegramError(error: unknown): { retryAfterSeconds: number | null; code: number | null } {
  if (!(error instanceof GrammyError)) {
    return { retryAfterSeconds: null, code: null };
  }

  const retryAfter = typeof error.parameters?.retry_after === "number" ? error.parameters.retry_after : null;
  return {
    retryAfterSeconds: retryAfter,
    code: error.error_code
  };
}
