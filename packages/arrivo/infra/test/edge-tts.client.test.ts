import { describe, expect, test } from "bun:test";
import { parseEdgeWordBoundaries } from "../src/edge-tts.client";

describe("parseEdgeWordBoundaries", () => {
  test("converts Edge ticks to milliseconds and decodes text", () => {
    const words = parseEdgeWordBoundaries(JSON.stringify({
      Metadata: [
        {
          Type: "WordBoundary",
          Data: {
            Offset: 5_000_000,
            Duration: 2_500_000,
            text: { Text: "Arrivo" }
          }
        },
        {
          Type: "WordBoundary",
          Data: {
            Offset: 7_500_000,
            Duration: 1_000_000,
            text: { Text: "Tom &amp; Jerry" }
          }
        },
        { Type: "SessionEnd", Data: {} }
      ]
    }));

    expect(words).toEqual([
      { text: "Arrivo", offsetMs: 500, durationMs: 250 },
      { text: "Tom & Jerry", offsetMs: 750, durationMs: 100 }
    ]);
  });
});
