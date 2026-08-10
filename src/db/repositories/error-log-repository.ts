import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../schema.js";

export class ErrorLogRepository {
  public constructor(private readonly db: Kysely<DatabaseSchema>) {}

  public async add(code: string, message: string, context: Record<string, unknown>): Promise<void> {
    await this.db
      .insertInto("error_log")
      .values({
        code,
        message,
        context_json: JSON.stringify(context)
      })
      .execute();
  }

  public async latest(): Promise<{ code: string; message: string; createdAt: string } | null> {
    const row = await this.db
      .selectFrom("error_log")
      .select(["code", "message", "created_at as createdAt"])
      .orderBy("created_at", "desc")
      .executeTakeFirst();
    return row ?? null;
  }
}
