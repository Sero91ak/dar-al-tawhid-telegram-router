import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContext } from "../fixtures/test-context.js";

describe("media group service", () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeEach(async () => {
    ctx = await createTestContext("forward");
  });

  afterEach(async () => {
    if (ctx) {
      await ctx.destroy();
    }
  });

  it("recovers pending media groups after restart-like interruption", async () => {
    await ctx.mediaGroups.add({
      sourceChatId: "-1001",
      mediaGroupId: "album-recover",
      sourceMessageId: 31,
      captionOrText: "",
      payloadJson: "{}"
    });
    await ctx.mediaGroups.add({
      sourceChatId: "-1001",
      mediaGroupId: "album-recover",
      sourceMessageId: 32,
      captionOrText: "#Quran",
      payloadJson: "{}"
    });

    const recovered = await ctx.mediaGroupService.recoverPendingGroups();

    expect(recovered).toHaveLength(1);
    expect(recovered[0]).toEqual({
      sourceChatId: "-1001",
      sourceMessageId: 31,
      sourceMessageIds: [31, 32],
      mediaGroupId: "album-recover",
      captionOrText: "#Quran"
    });
  });
});
