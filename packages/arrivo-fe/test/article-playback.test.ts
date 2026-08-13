import { describe, expect, test } from 'bun:test';
import { SUPPORTED_PLAYBACK_VOICES } from '@arrivo/contracts';
import voices from '../src/data/en.json';
import {
  normalizePlaybackSettings,
  playbackSettingsStorageKey,
  readCachedPlaybackSettings,
  resolvePlaybackCompletion,
  writeCachedPlaybackSettings
} from '../src/pages/article/playback';

const defaultVoice = 'en-AU-NatashaNeural';

describe('article playback settings', () => {
  test('normalizes server and cached values to the supported UI range', () => {
    expect(
      normalizePlaybackSettings(
        {
          voice: '',
          playbackRate: 2.8,
          repeatCount: 2.7,
          extraPauseSeconds: 3.3
        },
        defaultVoice
      )
    ).toEqual({
      learningLanguages: ['en'],
      activeLanguage: 'en',
      voices: {
        en: defaultVoice,
        vi: 'vi-VN-HoaiMyNeural',
        fi: 'fi-FI-NooraNeural'
      },
      playbackRate: 2,
      repeatCount: 3,
      extraPauseSeconds: 3.5,
      showTranslation: true,
      readingMode: 'list'
    });
    expect(normalizePlaybackSettings({ voice: 'not-a-real-voice' }, defaultVoice).voices.en).toBe(defaultVoice);
  });

  test('keeps the UI voice list aligned with the server allowlist', () => {
    expect(voices.map((voice) => voice.name)).toEqual(
      SUPPORTED_PLAYBACK_VOICES.filter((voice) => voice.startsWith('en-'))
    );
  });

  test('keeps the last successful settings isolated by user id', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    const settings = normalizePlaybackSettings(
      {
        learningLanguages: ['en', 'vi'],
        activeLanguage: 'vi',
        voices: {
          en: 'en-US-JennyNeural',
          vi: 'vi-VN-NamMinhNeural',
          fi: 'fi-FI-NooraNeural'
        },
        playbackRate: 1.2,
        repeatCount: 3,
        extraPauseSeconds: 1.5
      },
      defaultVoice
    );

    writeCachedPlaybackSettings('user-a', settings, storage);

    expect(playbackSettingsStorageKey('user-a')).not.toBe(playbackSettingsStorageKey('user-b'));
    expect(readCachedPlaybackSettings('user-a', defaultVoice, storage)).toEqual(settings);
    expect(readCachedPlaybackSettings('user-b', defaultVoice, storage)).toBeNull();
  });

  test('normalizes account-wide reading preferences', () => {
    expect(
      normalizePlaybackSettings(
        {
          showTranslation: false,
          readingMode: 'focus'
        },
        defaultVoice
      )
    ).toMatchObject({
      showTranslation: false,
      readingMode: 'focus'
    });
    expect(
      normalizePlaybackSettings(
        {
          readingMode: 'unsupported' as any
        },
        defaultVoice
      )
    ).toMatchObject({
      showTranslation: true,
      readingMode: 'list'
    });
  });
});

describe('article continuous playback', () => {
  test('continues through sentences before considering another article', () => {
    expect(
      resolvePlaybackCompletion({
        sentenceIndex: 0,
        sentenceCount: 2,
        nextArticleId: 'article-2',
        continuous: true
      })
    ).toEqual({ type: 'next-sentence', sentenceIndex: 1 });
  });

  test('only crosses the article boundary in continuous playback mode', () => {
    expect(
      resolvePlaybackCompletion({
        sentenceIndex: 1,
        sentenceCount: 2,
        nextArticleId: 'article-2',
        continuous: false
      })
    ).toEqual({ type: 'stop' });

    expect(
      resolvePlaybackCompletion({
        sentenceIndex: 1,
        sentenceCount: 2,
        nextArticleId: 'article-2',
        continuous: true
      })
    ).toEqual({ type: 'next-article', articleId: 'article-2' });
  });

  test('reports completion after the last article', () => {
    expect(
      resolvePlaybackCompletion({
        sentenceIndex: 0,
        sentenceCount: 1,
        nextArticleId: null,
        continuous: true
      })
    ).toEqual({ type: 'all-complete' });
  });
});

describe('article playback layout', () => {
  test('keeps the header fixed and the countdown numerically stable', async () => {
    const styles = await Bun.file(new URL('../src/pages/article/index.module.less', import.meta.url)).text();

    expect(styles).toContain('position: fixed;');
    expect(styles).toContain('env(safe-area-inset-top)');
    expect(styles).toContain('font-variant-numeric: tabular-nums;');
    expect(styles).toContain('width: 5ch;');
    expect(styles).toContain('.countdownRow');
  });
});

describe('article word seeking', () => {
  test('pauses, seeks, then resumes when a word is selected during playback', async () => {
    const source = await Bun.file(new URL('../src/pages/article/sentence.item.tsx', import.meta.url)).text();
    const normalizedSource = source.replaceAll('"', "'").replace(/\s+/g, ' ');

    expect(normalizedSource).toContain('void resumeAudioPlayback(word.offsetMs / 1000);');
    expect(normalizedSource).toContain('const word = wordBoundaries[wordIndex];');
    expect(normalizedSource).toContain('void handlePlayCurrentWord(word, wordIndex);');
    expect(normalizedSource).toContain('audio.pause(); stopHighlightTracking(); await seekAudio(audio, resumeAt);');
    expect(normalizedSource).toContain('Math.abs(audio.currentTime - seekTo) <= 0.05');
    expect(normalizedSource).toContain("audio.addEventListener('seeked', handleSeeked);");
    expect(normalizedSource).toContain('const resumeAt = nextCount === 1 ? resumeWordOffsetRef.current : null;');
    expect(normalizedSource).toContain(
      'Article play once count=${nextCount} resumeAt=${resumeAt} currentTime=${audio.currentTime}'
    );
    expect(normalizedSource).toContain(
      'Article word seek completed resumeAt=${resumeAt} currentTime=${audio.currentTime}'
    );
    expect(normalizedSource).toContain('startedPlaybackSessionRef.current !== session');
    expect(normalizedSource).toContain('sentence.onWordPreviewed(sentence.id, wordIndex);');
    expect(normalizedSource).not.toContain('播放当前单词');
  });

  test('keeps the word ripple visible while its preview audio is playing', async () => {
    const source = await Bun.file(new URL('../src/pages/article/sentence.item.tsx', import.meta.url)).text();
    const normalizedSource = source.replaceAll('"', "'").replace(/\s+/g, ' ');
    const styles = await Bun.file(new URL('../src/pages/article/index.module.less', import.meta.url)).text();

    expect(normalizedSource).toContain('const [previewLoadingWordIndex, setPreviewLoadingWordIndex] = useState(-1);');
    expect(normalizedSource).toContain('const [previewPlayingWordIndex, setPreviewPlayingWordIndex] = useState(-1);');
    expect(normalizedSource).toContain('wordIndex === previewLoadingWordIndex ? styles.wordPreviewLoading');
    expect(normalizedSource).toContain('wordIndex === previewPlayingWordIndex ? styles.wordPreviewPlaying');
    expect(styles).toContain('.wordPreviewLoading');
    expect(styles).toContain('.wordPreviewPlaying');
  });

  test('supports long-press continuous word preview with a distinct ripple and stop action', async () => {
    const source = await Bun.file(new URL('../src/pages/article/sentence.item.tsx', import.meta.url)).text();
    const normalizedSource = source.replaceAll('"', "'").replace(/\s+/g, ' ');
    const styles = await Bun.file(new URL('../src/pages/article/index.module.less', import.meta.url)).text();

    expect(normalizedSource).toContain('const startContinuousWordPreview = useCallback');
    expect(normalizedSource).toContain('Math.round(playbackMs + 1000)');
    expect(normalizedSource).toContain('longPressTimerRef.current = window.setTimeout');
    expect(normalizedSource).toContain('}, 450);');
    expect(normalizedSource).toContain('if (continuousPreviewWordIndexRef.current === wordIndex)');
    expect(normalizedSource).toContain('styles.wordPreviewContinuous');
    expect(styles).toContain('.wordPreviewContinuous');
  });

  test('keeps the screen awake through playback pauses and catches up a throttled word repeat', async () => {
    const source = await Bun.file(new URL('../src/pages/article/sentence.item.tsx', import.meta.url)).text();
    const normalizedSource = source.replaceAll('"', "'").replace(/\s+/g, ' ');

    expect(normalizedSource).toContain('function useScreenWakeLock(keepScreenAwake: boolean)');
    expect(normalizedSource).toContain('const keepScreenAwake = sentence.playing');
    expect(normalizedSource).toContain('|| continuousPreviewWordIndex !== -1;');
    expect(normalizedSource).toContain("wakeLock.request('screen')");
    expect(normalizedSource).toContain("document.addEventListener('visibilitychange', onVisibilityChange);");
    expect(normalizedSource).toContain('continuousPreviewDueAtRef.current = Date.now() + delayMs;');
    expect(normalizedSource).toContain('resumeContinuousPreviewRef.current?.();');
  });

  test('cancels a pending repeat countdown before previewing a selected word', async () => {
    const source = await Bun.file(new URL('../src/pages/article/sentence.item.tsx', import.meta.url)).text();
    const normalizedSource = source.replaceAll('"', "'").replace(/\s+/g, ' ');

    expect(normalizedSource).toContain('if (isWaite) { clearRepeatTimer();');
    expect(normalizedSource).toContain('countdownCompleteRef.current = null;');
    expect(normalizedSource).toContain('setIsWaite(false); setIsPaused(true);');
  });
});

describe('article navigation', () => {
  test('returns to the previous route instead of forcing the home page', async () => {
    const source = await Bun.file(new URL('../src/pages/article/index.tsx', import.meta.url)).text();

    expect(source).toContain('router(-1);');
    expect(source).not.toContain("const handleGoBack = () => {\n    router('/');");
  });

  test('switches one global learning language for tabs, voices, and playback', async () => {
    const source = await Bun.file(new URL('../src/pages/article/index.tsx', import.meta.url)).text();
    const normalizedSource = source.replaceAll('"', "'").replace(/\s+/g, ' ');

    expect(normalizedSource).toContain('const changeActiveLanguage = useCallback');
    expect(normalizedSource).toContain('setActiveSentenceIndex(null); setContinuousPlayback(false);');
    expect(normalizedSource).toContain('voices[activeLanguage]');
    expect(normalizedSource).toContain('languageTabs={');
    expect(normalizedSource).toContain("mode='multiple'");
    expect(normalizedSource).toContain('generatingLanguages.has(activeLanguage)');
    expect(normalizedSource).toContain('languageGenerationErrors[activeLanguage]');
    expect(normalizedSource).toContain('languageGenerationRequestRef.current.get(attemptKey) !== requestId');
    expect(normalizedSource).toContain("if (activeLanguage === 'en') { items.push(");
  });
});
