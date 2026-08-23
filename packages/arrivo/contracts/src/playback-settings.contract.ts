import { z } from "zod";

export const LEARNING_LANGUAGES = ["en", "vi", "fi"] as const;
export const learningLanguageCodeSchema = z.enum(LEARNING_LANGUAGES);
export type LearningLanguageCode = z.infer<typeof learningLanguageCodeSchema>;

export const LEARNING_LANGUAGE_OPTIONS: ReadonlyArray<{
  code: LearningLanguageCode;
  label: string;
  nativeLabel: string;
}> = [
  { code: "en", label: "英语", nativeLabel: "English" },
  { code: "vi", label: "越南语", nativeLabel: "Tiếng Việt" },
  { code: "fi", label: "芬兰语", nativeLabel: "Suomi" }
];

export const SUPPORTED_PLAYBACK_VOICES = [
  "en-AU-NatashaNeural",
  "en-AU-WilliamNeural",
  "en-CA-ClaraNeural",
  "en-CA-LiamNeural",
  "en-GB-LibbyNeural",
  "en-GB-MaisieNeural",
  "en-GB-RyanNeural",
  "en-GB-SoniaNeural",
  "en-GB-ThomasNeural",
  "en-HK-SamNeural",
  "en-HK-YanNeural",
  "en-IE-ConnorNeural",
  "en-IE-EmilyNeural",
  "en-IN-NeerjaExpressiveNeural",
  "en-IN-NeerjaNeural",
  "en-IN-PrabhatNeural",
  "en-KE-AsiliaNeural",
  "en-KE-ChilembaNeural",
  "en-NG-AbeoNeural",
  "en-NG-EzinneNeural",
  "en-NZ-MitchellNeural",
  "en-NZ-MollyNeural",
  "en-PH-JamesNeural",
  "en-PH-RosaNeural",
  "en-SG-LunaNeural",
  "en-SG-WayneNeural",
  "en-TZ-ElimuNeural",
  "en-TZ-ImaniNeural",
  "en-US-AnaNeural",
  "en-US-AndrewMultilingualNeural",
  "en-US-AndrewNeural",
  "en-US-AriaNeural",
  "en-US-AvaMultilingualNeural",
  "en-US-AvaNeural",
  "en-US-BrianMultilingualNeural",
  "en-US-BrianNeural",
  "en-US-ChristopherNeural",
  "en-US-EmmaMultilingualNeural",
  "en-US-EmmaNeural",
  "en-US-EricNeural",
  "en-US-GuyNeural",
  "en-US-JennyNeural",
  "en-US-MichelleNeural",
  "en-US-RogerNeural",
  "en-US-SteffanNeural",
  "en-ZA-LeahNeural",
  "en-ZA-LukeNeural",
  "vi-VN-HoaiMyNeural",
  "vi-VN-NamMinhNeural",
  "fi-FI-HarriNeural",
  "fi-FI-NooraNeural"
] as const;

const supportedPlaybackVoices = new Set<string>(SUPPORTED_PLAYBACK_VOICES);
const playbackVoiceSchema = (languageCode: LearningLanguageCode) => z
  .string()
  .trim()
  .refine((voice) => supportedPlaybackVoices.has(voice) && voice.startsWith(`${languageCode}-`), {
    message: "不支持该音色"
  });

export const DEFAULT_VOICE_BY_LANGUAGE: Record<LearningLanguageCode, string> = {
  en: "en-AU-NatashaNeural",
  vi: "vi-VN-HoaiMyNeural",
  fi: "fi-FI-NooraNeural"
};

const extraPauseSecondsSchema = z
  .number()
  .min(0)
  .max(10)
  .refine((value) => Number.isInteger(value * 2), {
    message: "额外停顿必须以 0.5 秒为步进"
  });

export const playbackSettingsInputSchema = z.object({
  learningLanguages: z.array(learningLanguageCodeSchema).min(1).max(LEARNING_LANGUAGES.length)
    .transform((languages) => [...new Set(languages)]),
  activeLanguage: learningLanguageCodeSchema,
  voices: z.object({
    en: playbackVoiceSchema("en"),
    vi: playbackVoiceSchema("vi"),
    fi: playbackVoiceSchema("fi")
  }),
  playbackRate: z.number().min(0.5).max(2),
  repeatCount: z.number().int().min(1).max(10),
  extraPauseSeconds: extraPauseSecondsSchema,
  showOriginal: z.boolean().default(true),
  showTranslation: z.boolean().default(true),
  readingMode: z.enum(["list", "focus"]).default("list")
}).refine((settings) => settings.learningLanguages.includes(settings.activeLanguage), {
  path: ["activeLanguage"],
  message: "当前语言必须包含在已选学习语言中"
});

export type PlaybackSettingsInput = z.infer<typeof playbackSettingsInputSchema>;
export type PlaybackSettingsDto = PlaybackSettingsInput;

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettingsDto = {
  learningLanguages: ["en"],
  activeLanguage: "en",
  voices: { ...DEFAULT_VOICE_BY_LANGUAGE },
  playbackRate: 1,
  repeatCount: 1,
  extraPauseSeconds: 0,
  showOriginal: true,
  showTranslation: true,
  readingMode: "list"
};
