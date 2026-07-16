import { describe, expect, test } from 'bun:test';
import { SUPPORTED_PLAYBACK_VOICES } from '@arrivo/contracts';
import voices from '../src/data/en.json';
import {
  normalizePlaybackSettings,
  playbackSettingsStorageKey,
  readCachedPlaybackSettings,
  resolvePlaybackCompletion,
  writeCachedPlaybackSettings,
} from '../src/pages/article/playback';

const defaultVoice = 'en-AU-NatashaNeural';

describe('article playback settings', () => {
  test('normalizes server and cached values to the supported UI range', () => {
    expect(normalizePlaybackSettings({
      voice: '',
      playbackRate: 2.8,
      repeatCount: 2.7,
      extraPauseSeconds: 3.3,
    }, defaultVoice)).toEqual({
      voice: defaultVoice,
      playbackRate: 2,
      repeatCount: 3,
      extraPauseSeconds: 3.5,
    });
    expect(normalizePlaybackSettings({ voice: 'not-a-real-voice' }, defaultVoice).voice).toBe(defaultVoice);
  });

  test('keeps the UI voice list aligned with the server allowlist', () => {
    expect(voices.map((voice) => voice.name)).toEqual([...SUPPORTED_PLAYBACK_VOICES]);
  });

  test('keeps the last successful settings isolated by user id', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const settings = normalizePlaybackSettings({
      voice: 'en-US-JennyNeural',
      playbackRate: 1.2,
      repeatCount: 3,
      extraPauseSeconds: 1.5,
    }, defaultVoice);

    writeCachedPlaybackSettings('user-a', settings, storage);

    expect(playbackSettingsStorageKey('user-a')).not.toBe(playbackSettingsStorageKey('user-b'));
    expect(readCachedPlaybackSettings('user-a', defaultVoice, storage)).toEqual(settings);
    expect(readCachedPlaybackSettings('user-b', defaultVoice, storage)).toBeNull();
  });
});

describe('article continuous playback', () => {
  test('continues through sentences before considering another article', () => {
    expect(resolvePlaybackCompletion({
      sentenceIndex: 0,
      sentenceCount: 2,
      nextArticleId: 'article-2',
      continuous: true,
    })).toEqual({ type: 'next-sentence', sentenceIndex: 1 });
  });

  test('only crosses the article boundary in continuous playback mode', () => {
    expect(resolvePlaybackCompletion({
      sentenceIndex: 1,
      sentenceCount: 2,
      nextArticleId: 'article-2',
      continuous: false,
    })).toEqual({ type: 'stop' });

    expect(resolvePlaybackCompletion({
      sentenceIndex: 1,
      sentenceCount: 2,
      nextArticleId: 'article-2',
      continuous: true,
    })).toEqual({ type: 'next-article', articleId: 'article-2' });
  });

  test('reports completion after the last article', () => {
    expect(resolvePlaybackCompletion({
      sentenceIndex: 0,
      sentenceCount: 1,
      nextArticleId: null,
      continuous: true,
    })).toEqual({ type: 'all-complete' });
  });
});

describe('article playback layout', () => {
  test('keeps the header fixed and the countdown numerically stable', async () => {
    const styles = await Bun.file(
      new URL('../src/pages/article/index.module.less', import.meta.url),
    ).text();

    expect(styles).toContain('position: fixed;');
    expect(styles).toContain('env(safe-area-inset-top)');
    expect(styles).toContain('font-variant-numeric: tabular-nums;');
    expect(styles).toContain('width: 5ch;');
    expect(styles).toContain('.countdownRow');
  });
});
