import Database from "better-sqlite3";
import { Kysely, PostgresDialect, SqliteDialect } from "kysely";
import pg from "pg";
import type { AppConfig } from "../config/env.js";
import type { DatabaseSchema } from "./schema.js";
import { runMigrations } from "./migrate.js";

export interface DatabaseContainer {
  db: Kysely<DatabaseSchema>;
  destroy: () => Promise<void>;
}

export async function createDatabase(config: Pick<AppConfig, "DATABASE_URL">): Promise<DatabaseContainer> {
  const url = config.DATABASE_URL;

  if (url.startsWith("sqlite:")) {
    const filename = url.replace(/^sqlite:/, "");
    const sqlite = new Database(filename);
    sqlite.pragma("journal_mode = WAL");

    const db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: sqlite })
    });

    await runMigrations(db, "sqlite");
    return {
      db,
      destroy: async () => {
        await db.destroy();
        sqlite.close();
      }
    };
  }

  const pool = new pg.Pool({ connectionString: url });
  const db = new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({ pool })
  });

  await runMigrations(db, "postgres");
  return {
    db,
    destroy: async () => {
      await db.destroy();
      await pool.end();
    }
  };
}
