import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContext } from "../fixtures/test-context.js";

describe("routing service", () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeEach(async () => {
    ctx = await createTestContext("forward");
  });

  afterEach(async () => {
    if (ctx) {
      await ctx.destroy();
    }
  });

  it("routes to two categories once each", async () => {
    await ctx.topicRegistry.register({ category: "salaf", targetForumId: "-2002", threadId: 101, adminUserId: "7" });
    await ctx.topicRegistry.register({ category: "manhaj", targetForumId: "-2002", threadId: 102, adminUserId: "7" });

    const result = await ctx.routingService.routeSourcePost({
      sourceChatId: "-1001",
      sourceMessageId: 10,
      sourceMessageIds: [10],
      mediaGroupId: null,
      captionOrText: "#DarAlTawhid #IbnSirin #Salaf #Adab"
    });

    expect(result.successes).toEqual(["salaf", "manhaj"]);
    expect(ctx.telegram.calls).toHaveLength(2);
  });

  it("does not route to general on missing topic id", async () => {
    const result = await ctx.routingService.routeSourcePost({
      sourceChatId: "-1001",
      sourceMessageId: 11,
      sourceMessageIds: [11],
      mediaGroupId: null,
      captionOrText: "#Fiqh"
    });

    expect(result.successes).toEqual([]);
    expect(result.failures).toEqual([{ category: "fiqh", error: "fiqh route not registered" }]);
    expect(ctx.telegram.calls).toHaveLength(0);
  });

  it("prevents duplicate sends on repeated post", async () => {
    await ctx.topicRegistry.register({ category: "aqidah", targetForumId: "-2002", threadId: 103, adminUserId: "7" });

    const envelope = {
      sourceChatId: "-1001",
      sourceMessageId: 12,
      sourceMessageIds: [12],
      mediaGroupId: null,
      captionOrText: "#Aqidah #Tawhid"
    };

    await ctx.routingService.routeSourcePost(envelope);
    await ctx.routingService.routeSourcePost(envelope);

    expect(ctx.telegram.calls).toHaveLength(1);
  });

  it("uses copy mode when configured", async () => {
    await ctx.destroy();
    ctx = await createTestContext("copy");
    await ctx.topicRegistry.register({ category: "hadith", targetForumId: "-2002", threadId: 104, adminUserId: "7" });

    await ctx.routingService.routeSourcePost({
      sourceChatId: "-1001",
      sourceMessageId: 13,
      sourceMessageIds: [13],
      mediaGroupId: null,
      captionOrText: "#Hadith"
    });

    expect(ctx.telegram.calls[0]?.kind).toBe("copySingle");
  });

  it("routes media albums as a single album operation", async () => {
    await ctx.topicRegistry.register({ category: "quran", targetForumId: "-2002", threadId: 105, adminUserId: "7" });

    await ctx.routingService.routeSourcePost({
      sourceChatId: "-1001",
      sourceMessageId: 14,
      sourceMessageIds: [14, 15, 16],
      mediaGroupId: "album-1",
      captionOrText: "#Quran"
    });

    expect(ctx.telegram.calls[0]?.kind).toBe("forwardAlbum");
  });

  it("retries temporary telegram failures and succeeds once", async () => {
    await ctx.topicRegistry.register({ category: "aqidah", targetForumId: "-2002", threadId: 106, adminUserId: "7" });
    ctx.telegram.forwardSingleFailures.push({ error_code: 429, parameters: { retry_after: 0 } });

    const result = await ctx.routingService.routeSourcePost({
      sourceChatId: "-1001",
      sourceMessageId: 15,
      sourceMessageIds: [15],
      mediaGroupId: null,
      captionOrText: "#Aqidah"
    });

    expect(result.successes).toEqual(["aqidah"]);
    expect(ctx.telegram.calls).toHaveLength(1);
  });
});
