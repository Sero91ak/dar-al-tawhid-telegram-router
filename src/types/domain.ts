import type { RoutingCategory } from "../config/routing.js";

export interface ParsedHashtag {
  raw: string;
  normalized: string;
}

export interface RoutingDecision {
  categories: RoutingCategory[];
  hashtags: ParsedHashtag[];
}

export interface TopicRouteRecord {
  category: RoutingCategory;
  threadId: number;
  targetForumId: string;
  createdBy: string;
  updatedAt: string;
}

export interface SourcePostEnvelope {
  sourceChatId: string;
  sourceMessageIds: number[];
  sourceMessageId: number;
  mediaGroupId: string | null;
  captionOrText: string;
}
