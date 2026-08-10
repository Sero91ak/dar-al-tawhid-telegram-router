export type RoutingCategory =
  | "aqidah"
  | "takfir"
  | "quran"
  | "hadith"
  | "salaf"
  | "fiqh"
  | "sirah"
  | "widerlegungen"
  | "manhaj";

export interface RouteDefinition {
  category: RoutingCategory;
  title: string;
  hashtags: string[];
}

export const ROUTE_DEFINITIONS: readonly RouteDefinition[] = [
  { category: "aqidah", title: "ʿAQĪDAH & TAWḤĪD", hashtags: ["Aqidah", "Tawhid"] },
  { category: "takfir", title: "TAKFĪR • KUFR • NAWĀQIḌ", hashtags: ["Takfir", "Kufr", "Nawaqid"] },
  { category: "quran", title: "QURʾĀN & TAFSĪR", hashtags: ["Quran", "Tafsir"] },
  { category: "hadith", title: "ḤADĪṮ & ĀṮĀR", hashtags: ["Hadith", "Athar"] },
  { category: "salaf", title: "SALAF & AHL AL-ḤADĪṮ", hashtags: ["Salaf", "AhlAlHadith"] },
  { category: "fiqh", title: "FIQH & UṢŪL AL-FIQH", hashtags: ["Fiqh", "UsulAlFiqh"] },
  { category: "sirah", title: "SĪRAH & GESCHICHTE", hashtags: ["Sirah", "Geschichte"] },
  { category: "widerlegungen", title: "WIDERLEGUNGEN", hashtags: ["Widerlegung", "Widerlegungen"] },
  { category: "manhaj", title: "MANHAJ & ADAB", hashtags: ["Manhaj", "Adab"] }
] as const;

export const CATEGORY_KEYS = ROUTE_DEFINITIONS.map((item) => item.category);

export const BRANDING_HASHTAGS = new Set(["daraltawhid"]);
