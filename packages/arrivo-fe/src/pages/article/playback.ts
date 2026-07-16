import {
  DEFAULT_PLAYBACK_SETTINGS,
  SUPPORTED_PLAYBACK_VOICES,
  type PlaybackSettingsDto,
} from '@arrivo/contracts';

export { DEFAULT_PLAYBACK_SETTINGS };
export type PlaybackSettings = PlaybackSettingsDto;

const supportedPlaybackVoices = new Set<string>(SUPPORTED_PLAYBACK_VOICES);

const roundToStep = (value: number, step: number) => (
  Math.round(value / step) * step
);

const normalizeNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  step: number,
) => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;

  return Number(Math.min(max, Math.max(min, roundToStep(numberValue, step))).toFixed(2));
};

export function normalizePlaybackSettings(
  value: Partial<PlaybackSettings> | null | undefined,
  defaultVoice = DEFAULT_PLAYBACK_SETTINGS.voice,
): PlaybackSettings {
  return {
    voice: typeof value?.voice === 'string' && supportedPlaybackVoices.has(value.voice.trim())
      ? value.voice.trim()
      : defaultVoice,
    playbackRate: normalizeNumber(value?.playbackRate, 1, 0.5, 2, 0.1),
    repeatCount: normalizeNumber(value?.repeatCount, 1, 1, 10, 1),
    extraPauseSeconds: normalizeNumber(value?.extraPauseSeconds, 0, 0, 10, 0.5),
  };
}

export const playbackSettingsStorageKey = (userId: string | number) => (
  `arrivo:playback-settings:${encodeURIComponent(String(userId))}`
);

type PlaybackSettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readCachedPlaybackSettings(
  userId: string | number,
  defaultVoice: string,
  storage: PlaybackSettingsStorage | null = typeof window === 'undefined' ? null : window.localStorage,
): PlaybackSettings | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(playbackSettingsStorageKey(userId));
    return value ? normalizePlaybackSettings(JSON.parse(value), defaultVoice) : null;
  } catch {
    return null;
  }
}

export function writeCachedPlaybackSettings(
  userId: string | number,
  settings: PlaybackSettings,
  storage: PlaybackSettingsStorage | null = typeof window === 'undefined' ? null : window.localStorage,
) {
  if (!storage) return;

  try {
    storage.setItem(playbackSettingsStorageKey(userId), JSON.stringify(settings));
  } catch {
    // Private browsing and full storage quotas should not block playback.
  }
}

export type PlaybackCompletion =
  | { type: 'next-sentence'; sentenceIndex: number }
  | { type: 'next-article'; articleId: string }
  | { type: 'all-complete' }
  | { type: 'stop' };

export function resolvePlaybackCompletion({
  sentenceIndex,
  sentenceCount,
  nextArticleId,
  continuous,
}: {
  sentenceIndex: number;
  sentenceCount: number;
  nextArticleId?: string | null;
  continuous: boolean;
}): PlaybackCompletion {
  const nextSentenceIndex = sentenceIndex + 1;
  if (nextSentenceIndex < sentenceCount) {
    return { type: 'next-sentence', sentenceIndex: nextSentenceIndex };
  }

  if (!continuous) return { type: 'stop' };
  if (nextArticleId) return { type: 'next-article', articleId: nextArticleId };
  return { type: 'all-complete' };
}
