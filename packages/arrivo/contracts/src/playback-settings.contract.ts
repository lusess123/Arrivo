import { z } from "zod";

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
  "en-ZA-LukeNeural"
] as const;

const supportedPlaybackVoices = new Set<string>(SUPPORTED_PLAYBACK_VOICES);
const playbackVoiceSchema = z.string().trim().refine(
  (voice) => supportedPlaybackVoices.has(voice),
  { message: "不支持该音色" }
);

const extraPauseSecondsSchema = z.number().min(0).max(10).refine(
  (value) => Number.isInteger(value * 2),
  { message: "额外停顿必须以 0.5 秒为步进" }
);

export const playbackSettingsInputSchema = z.object({
  voice: playbackVoiceSchema,
  playbackRate: z.number().min(0.5).max(2),
  repeatCount: z.number().int().min(1).max(10),
  extraPauseSeconds: extraPauseSecondsSchema
});

export type PlaybackSettingsInput = z.infer<typeof playbackSettingsInputSchema>;
export type PlaybackSettingsDto = PlaybackSettingsInput;

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettingsDto = {
  voice: "en-AU-NatashaNeural",
  playbackRate: 1,
  repeatCount: 1,
  extraPauseSeconds: 0
};
