import { describe, expect, it } from "vitest";
import { decideRouting, parseHashtags } from "../../src/bot/router/hashtag-parser.js";

describe("hashtag parser", () => {
  it("matches aqidah from #Aqidah", () => {
    expect(decideRouting("#Aqidah").categories).toEqual(["aqidah"]);
  });

  it("matches aqidah once from #Aqidah #Tawhid", () => {
    expect(decideRouting("#Aqidah #Tawhid").categories).toEqual(["aqidah"]);
  });

  it("matches takfir once from all aliases", () => {
    expect(decideRouting("#Takfir #Kufr #Nawaqid").categories).toEqual(["takfir"]);
  });

  it("matches salaf and manhaj together", () => {
    expect(decideRouting("#DarAlTawhid #IbnSirin #Salaf #Adab").categories).toEqual(["salaf", "manhaj"]);
  });

  it("does not route branding or people hashtags", () => {
    expect(decideRouting("#DarAlTawhid #IbnSirin").categories).toEqual([]);
  });

  it("matches quran once from aliases", () => {
    expect(decideRouting("#Quran #Tafsir").categories).toEqual(["quran"]);
  });

  it("matches fiqh once from aliases", () => {
    expect(decideRouting("#Fiqh #UsulAlFiqh").categories).toEqual(["fiqh"]);
  });

  it("ignores unknown hashtags", () => {
    expect(decideRouting("#Unknown").categories).toEqual([]);
  });

  it("does not match partial hashtags", () => {
    expect(decideRouting("#Adabiyyah").categories).toEqual([]);
  });

  it("handles case-insensitive routing", () => {
    expect(decideRouting("#aqidah #TAFSIR").categories).toEqual(["aqidah", "quran"]);
  });

  it("returns unique hashtags", () => {
    expect(parseHashtags("#Aqidah #Aqidah")).toHaveLength(1);
  });
});
