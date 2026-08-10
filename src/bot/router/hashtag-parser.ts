import { BRANDING_HASHTAGS, ROUTE_DEFINITIONS, type RoutingCategory } from "../../config/routing.js";
import type { ParsedHashtag, RoutingDecision } from "../../types/domain.js";

const hashtagPattern = /(^|[\s.,;:!?()[\]{}"'“”«»])#([A-Za-z][A-Za-z0-9_]*)\b/g;

const hashtagToCategory = new Map<string, RoutingCategory>();
for (const definition of ROUTE_DEFINITIONS) {
  for (const hashtag of definition.hashtags) {
    hashtagToCategory.set(hashtag.toLowerCase(), definition.category);
  }
}

export function parseHashtags(input: string): ParsedHashtag[] {
  const matches: ParsedHashtag[] = [];
  const seen = new Set<string>();

  for (const match of input.matchAll(hashtagPattern)) {
    const raw = match[2];
    if (!raw) {
      continue;
    }

    const normalized = raw.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    matches.push({ raw, normalized });
  }

  return matches;
}

export function decideRouting(input: string): RoutingDecision {
  const hashtags = parseHashtags(input);
  const categories = new Set<RoutingCategory>();

  for (const hashtag of hashtags) {
    if (BRANDING_HASHTAGS.has(hashtag.normalized)) {
      continue;
    }

    const category = hashtagToCategory.get(hashtag.normalized);
    if (category) {
      categories.add(category);
    }
  }

  return {
    categories: [...categories],
    hashtags
  };
}
