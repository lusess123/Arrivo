import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  SUPPORTED_PLAYBACK_VOICES,
  playbackSettingsInputSchema
} from "../src";

describe("playbackSettingsInputSchema", () => {
  test("accepts three selected languages with language-specific voices", () => {
    expect(
      playbackSettingsInputSchema.parse({
        learningLanguages: ["en", "vi", "fi"],
        activeLanguage: "vi",
        voices: {
          en: "  en-AU-NatashaNeural  ",
          vi: "vi-VN-HoaiMyNeural",
          fi: "fi-FI-NooraNeural"
        },
        playbackRate: 0.5,
        repeatCount: 10,
        extraPauseSeconds: 10
      })
    ).toEqual({
      learningLanguages: ["en", "vi", "fi"],
      activeLanguage: "vi",
      voices: {
        en: "en-AU-NatashaNeural",
        vi: "vi-VN-HoaiMyNeural",
        fi: "fi-FI-NooraNeural"
      },
      playbackRate: 0.5,
      repeatCount: 10,
      extraPauseSeconds: 10,
      showOriginal: true,
      showTranslation: true,
      readingMode: "list"
    });
    expect(DEFAULT_PLAYBACK_SETTINGS.learningLanguages).toEqual(["en"]);
    expect(SUPPORTED_PLAYBACK_VOICES).toContain(DEFAULT_PLAYBACK_SETTINGS.voices.en);
    expect(SUPPORTED_PLAYBACK_VOICES).toContain(DEFAULT_PLAYBACK_SETTINGS.voices.vi);
    expect(SUPPORTED_PLAYBACK_VOICES).toContain(DEFAULT_PLAYBACK_SETTINGS.voices.fi);
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
    { voices: { ...DEFAULT_PLAYBACK_SETTINGS.voices, en: "not-a-real-voice" } },
    { learningLanguages: [] },
    { learningLanguages: ["en"], activeLanguage: "vi" },
    { voices: { ...DEFAULT_PLAYBACK_SETTINGS.voices, vi: "en-US-JennyNeural" } }
  ])("rejects invalid setting %o", (override) => {
    expect(
      playbackSettingsInputSchema.safeParse({
        ...DEFAULT_PLAYBACK_SETTINGS,
        ...override
      }).success
    ).toBe(false);
  });

  test("accepts account-wide reading preferences", () => {
    expect(
      playbackSettingsInputSchema.parse({
        ...DEFAULT_PLAYBACK_SETTINGS,
        playbackRate: 1,
        repeatCount: 1,
        extraPauseSeconds: 0,
        showOriginal: false,
        showTranslation: false,
        readingMode: "focus"
      })
    ).toEqual({
      learningLanguages: ["en"],
      activeLanguage: "en",
      voices: DEFAULT_PLAYBACK_SETTINGS.voices,
      playbackRate: 1,
      repeatCount: 1,
      extraPauseSeconds: 0,
      showOriginal: false,
      showTranslation: false,
      readingMode: "focus"
    });
  });
});
