import type { TelegramGateway } from "../../src/services/telegram-gateway.js";

export class MockTelegramGateway implements TelegramGateway {
  public readonly calls: Array<{
    kind: "forwardSingle" | "copySingle" | "forwardAlbum" | "copyAlbum";
    payload: Record<string, unknown>;
  }> = [];

  public async getMe() {
    return { username: "dar_router_bot" };
  }

  public async forwardSingle(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageId: number;
  }): Promise<number> {
    this.calls.push({ kind: "forwardSingle", payload: params });
    return 101;
  }

  public async copySingle(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageId: number;
  }): Promise<number> {
    this.calls.push({ kind: "copySingle", payload: params });
    return 201;
  }

  public async forwardAlbum(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageIds: number[];
  }): Promise<number | null> {
    this.calls.push({ kind: "forwardAlbum", payload: params });
    return 301;
  }

  public async copyAlbum(params: {
    fromChatId: string;
    toChatId: string;
    threadId: number;
    messageIds: number[];
  }): Promise<number | null> {
    this.calls.push({ kind: "copyAlbum", payload: params });
    return 401;
  }
}
