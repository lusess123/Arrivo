import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  SUPPORTED_PLAYBACK_VOICES,
  playbackSettingsInputSchema
} from "../src";

describe("playbackSettingsInputSchema", () => {
  test("accepts the documented boundaries and normalizes the voice", () => {
    expect(playbackSettingsInputSchema.parse({
      voice: "  en-AU-NatashaNeural  ",
      playbackRate: 0.5,
      repeatCount: 10,
      extraPauseSeconds: 10
    })).toEqual({
      voice: "en-AU-NatashaNeural",
      playbackRate: 0.5,
      repeatCount: 10,
      extraPauseSeconds: 10
    });
    expect(DEFAULT_PLAYBACK_SETTINGS).toEqual({
      voice: "en-AU-NatashaNeural",
      playbackRate: 1,
      repeatCount: 1,
      extraPauseSeconds: 0
    });
    expect(SUPPORTED_PLAYBACK_VOICES).toContain(DEFAULT_PLAYBACK_SETTINGS.voice);
  });

  test.each([
    { playbackRate: 0.49 },
    { playbackRate: 2.01 },
    { repeatCount: 0 },
    { repeatCount: 11 },
    { repeatCount: 1.5 },
    { extraPauseSeconds: -0.5 },
    { extraPauseSeconds: 10.5 },
    { extraPauseSeconds: 0.25 },
    { voice: "not-a-real-voice" }
  ])("rejects invalid setting %o", (override) => {
    expect(playbackSettingsInputSchema.safeParse({
      ...DEFAULT_PLAYBACK_SETTINGS,
      ...override
    }).success).toBe(false);
  });
});
