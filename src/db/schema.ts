import type { Generated, Insertable, Selectable, Updateable } from "kysely";
import type { RoutingCategory } from "../config/routing.js";

export interface TopicRoutesTable {
  category: RoutingCategory;
  target_forum_id: string;
  thread_id: number;
  created_by: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface RoutedMessagesTable {
  id: Generated<number>;
  source_chat_id: string;
  source_message_id: number;
  source_message_ids_json: string;
  destination_chat_id: string;
  destination_thread_id: number;
  routing_category: RoutingCategory;
  media_group_id: string | null;
  routing_mode: "forward" | "copy";
  status: "pending" | "success" | "failed" | "skipped";
  telegram_destination_message_id: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface MediaGroupItemsTable {
  id: Generated<number>;
  source_chat_id: string;
  media_group_id: string;
  source_message_id: number;
  caption_or_text: string;
  payload_json: string;
  created_at: Generated<string>;
}

export interface AppStateTable {
  key: string;
  value_json: string;
  updated_at: Generated<string>;
}

export interface ErrorLogTable {
  id: Generated<number>;
  code: string;
  message: string;
  context_json: string;
  created_at: Generated<string>;
}

export interface DatabaseSchema {
  topic_routes: TopicRoutesTable;
  routed_messages: RoutedMessagesTable;
  media_group_items: MediaGroupItemsTable;
  app_state: AppStateTable;
  error_log: ErrorLogTable;
}

export type TopicRouteRow = Selectable<TopicRoutesTable>;
export type TopicRouteInsert = Insertable<TopicRoutesTable>;
export type TopicRouteUpdate = Updateable<TopicRoutesTable>;
