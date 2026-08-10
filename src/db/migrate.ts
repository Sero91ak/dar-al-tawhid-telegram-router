import { sql, type Kysely } from "kysely";
import type { DatabaseSchema } from "./schema.js";

export type SqlDialect = "sqlite" | "postgres";

const pgNow = sql`CURRENT_TIMESTAMP`;

export async function runMigrations(db: Kysely<DatabaseSchema>, dialect: SqlDialect): Promise<void> {
  if (dialect === "sqlite") {
    await sql`
      CREATE TABLE IF NOT EXISTS topic_routes (
        category TEXT PRIMARY KEY,
        target_forum_id TEXT NOT NULL,
        thread_id INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS routed_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_chat_id TEXT NOT NULL,
        source_message_id INTEGER NOT NULL,
        source_message_ids_json TEXT NOT NULL,
        destination_chat_id TEXT NOT NULL,
        destination_thread_id INTEGER NOT NULL,
        routing_category TEXT NOT NULL,
        media_group_id TEXT,
        routing_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        telegram_destination_message_id INTEGER,
        error_code TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS routed_messages_unique_route
      ON routed_messages (
        source_chat_id,
        source_message_id,
        destination_chat_id,
        destination_thread_id,
        routing_category
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS media_group_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_chat_id TEXT NOT NULL,
        media_group_id TEXT NOT NULL,
        source_message_id INTEGER NOT NULL,
        caption_or_text TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS media_group_items_unique_message
      ON media_group_items (source_chat_id, media_group_id, source_message_id)
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS error_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        message TEXT NOT NULL,
        context_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

    return;
  }

  await db.schema
    .createTable("topic_routes")
    .ifNotExists()
    .addColumn("category", "text", (col) => col.primaryKey())
    .addColumn("target_forum_id", "text", (col) => col.notNull())
    .addColumn("thread_id", "integer", (col) => col.notNull())
    .addColumn("created_by", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .execute();

  await db.schema
    .createTable("routed_messages")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("source_chat_id", "text", (col) => col.notNull())
    .addColumn("source_message_id", "integer", (col) => col.notNull())
    .addColumn("source_message_ids_json", "text", (col) => col.notNull())
    .addColumn("destination_chat_id", "text", (col) => col.notNull())
    .addColumn("destination_thread_id", "integer", (col) => col.notNull())
    .addColumn("routing_category", "text", (col) => col.notNull())
    .addColumn("media_group_id", "text")
    .addColumn("routing_mode", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("telegram_destination_message_id", "integer")
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .execute();

  await db.schema
    .createIndex("routed_messages_unique_route")
    .ifNotExists()
    .on("routed_messages")
    .columns(["source_chat_id", "source_message_id", "destination_chat_id", "destination_thread_id", "routing_category"])
    .unique()
    .execute();

  await db.schema
    .createTable("media_group_items")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("source_chat_id", "text", (col) => col.notNull())
    .addColumn("media_group_id", "text", (col) => col.notNull())
    .addColumn("source_message_id", "integer", (col) => col.notNull())
    .addColumn("caption_or_text", "text", (col) => col.notNull())
    .addColumn("payload_json", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .execute();

  await db.schema
    .createIndex("media_group_items_unique_message")
    .ifNotExists()
    .on("media_group_items")
    .columns(["source_chat_id", "media_group_id", "source_message_id"])
    .unique()
    .execute();

  await db.schema
    .createTable("app_state")
    .ifNotExists()
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("value_json", "text", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .execute();

  await db.schema
    .createTable("error_log")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("code", "text", (col) => col.notNull())
    .addColumn("message", "text", (col) => col.notNull())
    .addColumn("context_json", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(pgNow))
    .execute();
}
