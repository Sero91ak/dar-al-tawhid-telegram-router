import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../schema.js";

export class AppStateRepository {
  public constructor(private readonly db: Kysely<DatabaseSchema>) {}

  public async setJson<T>(key: string, value: T): Promise<void> {
    await this.db
      .insertInto("app_state")
      .values({
        key,
        value_json: JSON.stringify(value)
      })
      .onConflict((oc) =>
        oc.column("key").doUpdateSet({
          value_json: JSON.stringify(value),
          updated_at: new Date().toISOString()
        })
      )
      .execute();
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const row = await this.db.selectFrom("app_state").select("value_json").where("key", "=", key).executeTakeFirst();
    return row ? (JSON.parse(row.value_json) as T) : null;
  }
}
