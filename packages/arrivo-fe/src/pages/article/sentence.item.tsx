import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TtsWordBoundaryDto } from '@arrivo/contracts';
import styles from './index.module.less'
import { Button } from 'antd';
import { AudioOutlined, MoreOutlined, PauseCircleOutlined, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';
import { apiUrl } from '@/lib/api';
import {
  buildWordTextSegments,
  findActiveWordIndex,
  findPauseActiveWordIndex,
} from './word-highlight';
import { articleSentenceElementId } from './article-progress';

// Previously cached MP3 responses predate byte-range support. Bump the URL version
// so browsers fetch a seekable audio response instead of reusing that immutable cache.
const AUDIO_CACHE_VERSION = '20260726-range-v1';

export interface SentenceActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ISentenceItem {
    originalContent: string ,
    translatedContent: string,
    index : number,
    displayNumber: string,
    duration: number,
    id: string,
    totalPlayCount: number,
    playedWordIndexes: number[],
    resumePoint?: boolean,
    times: number,
    // s: string,
    v: string,
    rate: number,
    delay: number,
    playing: boolean,
    hasNext: boolean,
    playbackKey: number,
    onPlayStart: (index: number) => void,
    onPlayStop: (index: number) => void,
    onPlayEnd: (index: number) => void,
    onPlaybackCompleted: (id: string) => void,
    onWordPreviewed: (id: string, wordIndex: number) => void,
    sound: boolean,
    actions?: SentenceActionItem[],
    depth?: number,
    playable?: boolean,
    hierarchyControl?: React.ReactNode,
    transientContent?: React.ReactNode,
}

export default function SentenceItem(sentence: ISentenceItem) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordPreviewRef = useRef<HTMLAudioElement | null>(null);
  const continuousPreviewTimerRef = useRef<number | null>(null);
  const continuousPreviewWordIndexRef = useRef(-1);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextWordClickRef = useRef(false);
  const itemRef = useRef<HTMLDivElement | null>(null);
  const repeatTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const playbackElapsedMsRef = useRef(0);
  const countdownEndAtRef = useRef(0);
  const countdownRemainingMsRef = useRef(0);
  const countdownCompleteRef = useRef<(() => void) | null>(null);
  const highlightFrameRef = useRef<number | null>(null);
  const pauseHighlightFrameRef = useRef<number | null>(null);
  const pauseHighlightStartedAtRef = useRef(0);
  const pauseHighlightElapsedMsRef = useRef(0);
  const pauseHighlightTotalMsRef = useRef(0);
  const pauseHighlightSpeechDurationMsRef = useRef(0);
  const wordBoundariesRef = useRef<TtsWordBoundaryDto[]>([]);
  const activeWordIndexRef = useRef(-1);
  const resumeWordOffsetRef = useRef<number | null>(null);
  const startedPlaybackSessionRef = useRef<string | null>(null);
  const playCountRef = useRef(0);
  const [playCount, setPlayCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isWaite, setIsWaite] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseRemaining, setPauseRemaining] = useState(0);
  const [wordBoundaries, setWordBoundaries] = useState<TtsWordBoundaryDto[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [previewLoadingWordIndex, setPreviewLoadingWordIndex] = useState(-1);
  const [previewPlayingWordIndex, setPreviewPlayingWordIndex] = useState(-1);
  const [continuousPreviewWordIndex, setContinuousPreviewWordIndex] = useState(-1);
  const [previewedWordIndices, setPreviewedWordIndices] = useState<Set<number>>(
    () => new Set(sentence.playedWordIndexes),
  );
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const maxCount = Math.max(1, sentence.times || 1);
  const wordSegments = useMemo(
    () => buildWordTextSegments(sentence.originalContent, wordBoundaries),
    [sentence.originalContent, wordBoundaries],
  );

  useEffect(() => {
    setPreviewedWordIndices(new Set(sentence.playedWordIndexes));
  }, [sentence.id, sentence.originalContent, sentence.playedWordIndexes]);

  useEffect(() => {
    setIsActionPanelOpen(false);
  }, [sentence.id]);

  const stopWordPreview = useCallback(() => {
    if (continuousPreviewTimerRef.current !== null) {
      window.clearTimeout(continuousPreviewTimerRef.current);
      continuousPreviewTimerRef.current = null;
    }
    continuousPreviewWordIndexRef.current = -1;
    setContinuousPreviewWordIndex(-1);
    const preview = wordPreviewRef.current;
    if (preview) {
      preview.pause();
      preview.removeAttribute('src');
      preview.load();
      wordPreviewRef.current = null;
    }
    setPreviewLoadingWordIndex(-1);
    setPreviewPlayingWordIndex(-1);
  }, []);

  const stopHighlightTracking = useCallback(() => {
    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }
  }, []);

  const setHighlightedWord = useCallback((index: number) => {
    if (activeWordIndexRef.current === index) return;
    activeWordIndexRef.current = index;
    setActiveWordIndex(index);
  }, []);

  const startHighlightTracking = useCallback(() => {
    if (pauseHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(pauseHighlightFrameRef.current);
      pauseHighlightFrameRef.current = null;
    }
    stopHighlightTracking();
    const update = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused || audio.ended) {
        highlightFrameRef.current = null;
        return;
      }
      setHighlightedWord(findActiveWordIndex(
        wordBoundariesRef.current,
        audio.currentTime * 1000,
      ));
      highlightFrameRef.current = window.requestAnimationFrame(update);
    };
    update();
  }, [setHighlightedWord, stopHighlightTracking]);

  const stopPauseHighlightTracking = useCallback(() => {
    if (pauseHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(pauseHighlightFrameRef.current);
      pauseHighlightFrameRef.current = null;
    }
    pauseHighlightStartedAtRef.current = 0;
  }, []);

  const updatePauseHighlight = useCallback(() => {
    const totalMs = pauseHighlightTotalMsRef.current;
    const elapsedMs = Math.min(
      totalMs,
      pauseHighlightElapsedMsRef.current + Math.max(0, Date.now() - pauseHighlightStartedAtRef.current),
    );
    setHighlightedWord(findPauseActiveWordIndex(
      wordBoundariesRef.current,
      elapsedMs,
      pauseHighlightSpeechDurationMsRef.current,
      sentence.rate,
    ));
    return { elapsedMs, hasRemaining: elapsedMs < totalMs };
  }, [sentence.rate, setHighlightedWord]);

  const startPauseHighlightTracking = useCallback((
    totalMs: number,
    speechDurationMs: number,
    resume = false,
  ) => {
    stopPauseHighlightTracking();
    if (!resume) {
      pauseHighlightTotalMsRef.current = totalMs;
      pauseHighlightElapsedMsRef.current = 0;
      pauseHighlightSpeechDurationMsRef.current = speechDurationMs;
    }
    pauseHighlightStartedAtRef.current = Date.now();

    const update = () => {
      if (!updatePauseHighlight().hasRemaining) {
        pauseHighlightFrameRef.current = null;
        return;
      }
      pauseHighlightFrameRef.current = window.requestAnimationFrame(update);
    };
    update();
  }, [stopPauseHighlightTracking, updatePauseHighlight]);

  const clearRepeatTimer = useCallback(() => {
    if (repeatTimerRef.current !== null) {
      window.clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const resetPlaybackState = useCallback(() => {
    stopWordPreview();
    clearRepeatTimer();
    stopHighlightTracking();
    stopPauseHighlightTracking();
    countdownCompleteRef.current = null;
    countdownEndAtRef.current = 0;
    countdownRemainingMsRef.current = 0;
    playbackElapsedMsRef.current = 0;
    playCountRef.current = 0;
    resumeWordOffsetRef.current = null;
    startedAtRef.current = 0;
    setPlayCount(0);
    setPauseRemaining(0);
    setIsWaite(false);
    setIsPaused(false);
    setHighlightedWord(-1);
  }, [clearRepeatTimer, setHighlightedWord, stopHighlightTracking, stopPauseHighlightTracking, stopWordPreview]);

  const waitBeforeContinue = useCallback((
    seconds: number,
    onComplete: () => void,
    options: { resumeHighlight?: boolean; speechDurationMs?: number } = {},
  ) => {
    const { resumeHighlight = false, speechDurationMs = 0 } = options;
    const waitMs = Math.max(0, Math.round(seconds * 1000));

    if (!waitMs) {
      onComplete();
      return;
    }

    const updateRemaining = () => {
      const nextRemainingMs = Math.max(0, countdownEndAtRef.current - Date.now());
      countdownRemainingMsRef.current = nextRemainingMs;
      const nextRemaining = nextRemainingMs / 1000;
      setPauseRemaining(Number(nextRemaining.toFixed(1)));
    };

    clearRepeatTimer();
    countdownCompleteRef.current = onComplete;
    countdownEndAtRef.current = Date.now() + waitMs;
    countdownRemainingMsRef.current = waitMs;
    setIsWaite(true);
    setIsPaused(false);
    updateRemaining();
    startPauseHighlightTracking(
      resumeHighlight ? pauseHighlightTotalMsRef.current : waitMs,
      resumeHighlight ? pauseHighlightSpeechDurationMsRef.current : speechDurationMs,
      resumeHighlight,
    );
    countdownTimerRef.current = window.setInterval(updateRemaining, 100);
    repeatTimerRef.current = window.setTimeout(() => {
      const complete = countdownCompleteRef.current;
      clearRepeatTimer();
      countdownCompleteRef.current = null;
      countdownEndAtRef.current = 0;
      countdownRemainingMsRef.current = 0;
      setPauseRemaining(0);
      setIsWaite(false);
      setIsPaused(false);
      stopPauseHighlightTracking();
      complete?.();
    }, waitMs);
  }, [clearRepeatTimer, startPauseHighlightTracking, stopPauseHighlightTracking]);

  const pauseCountdown = useCallback(() => {
    const remainingMs = Math.max(0, countdownEndAtRef.current - Date.now());

    if (remainingMs <= 0) {
      const complete = countdownCompleteRef.current;
      clearRepeatTimer();
      countdownCompleteRef.current = null;
      countdownEndAtRef.current = 0;
      countdownRemainingMsRef.current = 0;
      setPauseRemaining(0);
      setIsWaite(false);
      setIsPaused(false);
      complete?.();
      return;
    }

    countdownRemainingMsRef.current = remainingMs;
    clearRepeatTimer();
    pauseHighlightElapsedMsRef.current = updatePauseHighlight().elapsedMs;
    stopPauseHighlightTracking();
    setPauseRemaining(Number((remainingMs / 1000).toFixed(1)));
    setIsWaite(true);
    setIsPaused(true);
  }, [clearRepeatTimer, stopPauseHighlightTracking, updatePauseHighlight]);

  const resumeCountdown = useCallback(() => {
    const complete = countdownCompleteRef.current;
    const remainingSeconds = countdownRemainingMsRef.current / 1000;

    if (!complete) {
      return;
    }

    if (remainingSeconds <= 0) {
      clearRepeatTimer();
      countdownCompleteRef.current = null;
      countdownEndAtRef.current = 0;
      countdownRemainingMsRef.current = 0;
      setPauseRemaining(0);
      setIsWaite(false);
      setIsPaused(false);
      complete();
      return;
    }

    waitBeforeContinue(remainingSeconds, complete, { resumeHighlight: true });
  }, [waitBeforeContinue]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // currentTime can throw before metadata is available in a few browsers.
      }
    }

    resetPlaybackState();
  }, [resetPlaybackState]);

  const playOnce = useCallback(async (nextCount: number) => {
    const audio = audioRef.current;

    if (!audio || !sentence.originalContent.trim()) {
      sentence.onPlayEnd(sentence.index);
      return;
    }

    clearRepeatTimer();
    stopWordPreview();
    stopPauseHighlightTracking();
    countdownCompleteRef.current = null;
    countdownEndAtRef.current = 0;
    countdownRemainingMsRef.current = 0;
    playbackElapsedMsRef.current = 0;
    playCountRef.current = nextCount;
    setPlayCount(nextCount);
    setPauseRemaining(0);
    setIsWaite(false);
    setIsPaused(false);

    if (itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    audio.volume = sentence.sound ? 1 : 0;
    audio.playbackRate = sentence.rate;
    const resumeAt = nextCount === 1 ? resumeWordOffsetRef.current : null;
    resumeWordOffsetRef.current = null;
    console.debug(`Article play once count=${nextCount} resumeAt=${resumeAt} currentTime=${audio.currentTime}`);
    try {
      audio.currentTime = resumeAt ?? 0;
    } catch {
      // Ignore seek errors while the browser is still loading metadata.
    }

    startedAtRef.current = Date.now();

    try {
      await audio.play();
      startHighlightTracking();
    } catch (error) {
      console.error('Audio play failed', error);
      resetPlaybackState();
      sentence.onPlayStop(sentence.index);
    }
  }, [
    clearRepeatTimer,
    resetPlaybackState,
    sentence.index,
    sentence.onPlayEnd,
    sentence.onPlayStop,
    sentence.originalContent,
    sentence.rate,
    sentence.sound,
    stopPauseHighlightTracking,
    stopWordPreview,
    startHighlightTracking,
  ]);

  const pauseAudioPlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    if (startedAtRef.current) {
      playbackElapsedMsRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = 0;
    }

    audio.pause();
    stopHighlightTracking();
    setIsPaused(true);
  }, [stopHighlightTracking]);

  const seekAudio = useCallback((audio: HTMLAudioElement, seekTo: number) => (
    new Promise<void>((resolve) => {
      let timer: number | undefined;
      const finish = () => {
        audio.removeEventListener('seeked', handleSeeked);
        if (timer !== undefined) window.clearTimeout(timer);
        resolve();
      };
      const handleSeeked = () => {
        if (Math.abs(audio.currentTime - seekTo) <= 0.05) {
          finish();
        }
      };

      audio.addEventListener('seeked', handleSeeked);
      timer = window.setTimeout(finish, 500);
      try {
        audio.currentTime = seekTo;
        handleSeeked();
      } catch {
        finish();
      }
    })
  ), []);

  const resumeAudioPlayback = useCallback(async (resumeAt?: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    stopWordPreview();
    if (resumeAt !== undefined) {
      clearRepeatTimer();
      stopPauseHighlightTracking();
      countdownCompleteRef.current = null;
      countdownEndAtRef.current = 0;
      countdownRemainingMsRef.current = 0;
      setPauseRemaining(0);
      setIsWaite(false);
      audio.pause();
      stopHighlightTracking();
      await seekAudio(audio, resumeAt);
      console.debug(`Article word seek completed resumeAt=${resumeAt} currentTime=${audio.currentTime}`);
      resumeWordOffsetRef.current = null;
    }

    audio.volume = sentence.sound ? 1 : 0;
    audio.playbackRate = sentence.rate;
    startedAtRef.current = Date.now();
    setIsPaused(false);

    try {
      await audio.play();
      startHighlightTracking();
    } catch (error) {
      console.error('Audio resume failed', error);
      resetPlaybackState();
      sentence.onPlayStop(sentence.index);
    }
  }, [
    clearRepeatTimer,
    resetPlaybackState,
    sentence.index,
    sentence.onPlayStop,
    sentence.rate,
    sentence.sound,
    seekAudio,
    startHighlightTracking,
    stopHighlightTracking,
    stopPauseHighlightTracking,
    stopWordPreview,
  ]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    clearRepeatTimer();
    audio.pause();
    resetPlaybackState();
    setDuration(0);
    wordBoundariesRef.current = [];
    setWordBoundaries([]);
    if (!sentence.originalContent.trim()) {
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    const params = new URLSearchParams({
      s: sentence.originalContent,
      v: sentence.v,
      cv: AUDIO_CACHE_VERSION,
    });
    audio.src = apiUrl(`/api/tts/audio?${params.toString()}`);
    audio.load();
    audio.playbackRate = sentence.rate;

    const controller = new AbortController();
    void fetch(apiUrl(`/api/tts/words?${params.toString()}`), {
      credentials: 'include',
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error(`Word timeline failed: ${response.status}`);
      const body = await response.json() as {
        data?: { words?: TtsWordBoundaryDto[] };
      };
      if (controller.signal.aborted) return;
      const words = Array.isArray(body.data?.words) ? body.data.words : [];
      wordBoundariesRef.current = words;
      setWordBoundaries(words);
    }).catch(error => {
      if (controller.signal.aborted) return;
      console.warn('Word timeline unavailable', error);
    });

    return () => controller.abort();
  }, [clearRepeatTimer, resetPlaybackState, sentence.originalContent, sentence.rate, sentence.v]);

  useEffect(() => {
    if (sentence.playing) {
      const session = `${sentence.playbackKey}:${sentence.index}`;
      if (startedPlaybackSessionRef.current !== session) {
        startedPlaybackSessionRef.current = session;
        void playOnce(1);
      }
    } else {
      startedPlaybackSessionRef.current = null;
      stopAudio();
    }

    return () => {
      clearRepeatTimer();
      stopHighlightTracking();
      stopPauseHighlightTracking();
      stopWordPreview();
    };
  }, [clearRepeatTimer, playOnce, sentence.playbackKey, sentence.playing, stopAudio, stopHighlightTracking, stopPauseHighlightTracking, stopWordPreview]);

  const handleTogglePlay = () => {
    if (sentence.playing) {
      if (isWaite) {
        if (isPaused) {
          const resumeAt = resumeWordOffsetRef.current;
          if (resumeAt === null) {
            resumeCountdown();
          } else {
            void resumeAudioPlayback(resumeAt);
          }
        } else {
          pauseCountdown();
        }
        return;
      }

      if (isPaused) {
        void resumeAudioPlayback(resumeWordOffsetRef.current ?? undefined);
      } else {
        pauseAudioPlayback();
      }
      return;
    }

    sentence.onPlayStart(sentence.index);
  };

  const handlePlayCurrentWord = useCallback((word: TtsWordBoundaryDto, wordIndex: number) => {
    if (!word.text) return;

    stopWordPreview();
    const params = new URLSearchParams({
      s: word.text,
      v: sentence.v,
      cv: AUDIO_CACHE_VERSION,
    });
    const preview = new Audio(apiUrl(`/api/tts/audio?${params.toString()}`));
    wordPreviewRef.current = preview;
    preview.volume = sentence.sound ? 1 : 0;
    preview.playbackRate = sentence.rate;
    setPreviewLoadingWordIndex(wordIndex);

    const finish = () => {
      if (wordPreviewRef.current !== preview) return;
      preview.pause();
      preview.removeAttribute('src');
      preview.load();
      wordPreviewRef.current = null;
      setPreviewLoadingWordIndex(-1);
      setPreviewPlayingWordIndex(-1);
    };
    preview.addEventListener('ended', finish, { once: true });
    preview.addEventListener('error', () => finish(), { once: true });
    void preview.play()
      .then(() => {
        if (wordPreviewRef.current !== preview) return;
        setPreviewLoadingWordIndex(-1);
        setPreviewPlayingWordIndex(wordIndex);
        setPreviewedWordIndices((current) => new Set(current).add(wordIndex));
        sentence.onWordPreviewed(sentence.id, wordIndex);
      })
      .catch(() => finish());
  }, [sentence.id, sentence.onWordPreviewed, sentence.rate, sentence.sound, sentence.v, stopWordPreview]);

  const startContinuousWordPreview = useCallback((word: TtsWordBoundaryDto, wordIndex: number) => {
    if (!word.text) return;

    stopWordPreview();
    continuousPreviewWordIndexRef.current = wordIndex;
    setContinuousPreviewWordIndex(wordIndex);

    const playAgain = () => {
      if (continuousPreviewWordIndexRef.current !== wordIndex) return;

      const params = new URLSearchParams({
        s: word.text,
        v: sentence.v,
        cv: AUDIO_CACHE_VERSION,
      });
      const preview = new Audio(apiUrl(`/api/tts/audio?${params.toString()}`));
      let playbackStartedAt = 0;
      wordPreviewRef.current = preview;
      preview.volume = sentence.sound ? 1 : 0;
      preview.playbackRate = sentence.rate;
      setPreviewLoadingWordIndex(wordIndex);

      const discardPreview = () => {
        preview.pause();
        preview.removeAttribute('src');
        preview.load();
        if (wordPreviewRef.current === preview) {
          wordPreviewRef.current = null;
          setPreviewLoadingWordIndex(-1);
          setPreviewPlayingWordIndex(-1);
        }
      };

      preview.addEventListener('ended', () => {
        if (continuousPreviewWordIndexRef.current !== wordIndex) {
          discardPreview();
          return;
        }
        const playbackMs = Math.max(0, performance.now() - playbackStartedAt);
        discardPreview();
        continuousPreviewTimerRef.current = window.setTimeout(
          playAgain,
          Math.round(playbackMs + 1000),
        );
      }, { once: true });
      preview.addEventListener('error', () => {
        discardPreview();
        if (continuousPreviewWordIndexRef.current === wordIndex) {
          continuousPreviewWordIndexRef.current = -1;
          setContinuousPreviewWordIndex(-1);
        }
      }, { once: true });
      void preview.play()
        .then(() => {
          if (wordPreviewRef.current !== preview) return;
          playbackStartedAt = performance.now();
          setPreviewLoadingWordIndex(-1);
          setPreviewPlayingWordIndex(wordIndex);
          setPreviewedWordIndices((current) => new Set(current).add(wordIndex));
          sentence.onWordPreviewed(sentence.id, wordIndex);
        })
        .catch(() => {
          discardPreview();
          if (continuousPreviewWordIndexRef.current === wordIndex) {
            continuousPreviewWordIndexRef.current = -1;
            setContinuousPreviewWordIndex(-1);
          }
        });
    };

    playAgain();
  }, [sentence.id, sentence.onWordPreviewed, sentence.rate, sentence.sound, sentence.v, stopWordPreview]);

  const cancelWordLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleWordPointerDown = useCallback((wordIndex: number) => {
    if (continuousPreviewWordIndexRef.current !== -1) return;
    const word = wordBoundaries[wordIndex];
    if (!word) return;

    cancelWordLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      suppressNextWordClickRef.current = true;
      setHighlightedWord(wordIndex);
      activeWordIndexRef.current = wordIndex;
      if (sentence.playing) {
        if (isWaite) {
          clearRepeatTimer();
          stopPauseHighlightTracking();
          countdownCompleteRef.current = null;
          countdownEndAtRef.current = 0;
          countdownRemainingMsRef.current = 0;
          setPauseRemaining(0);
          setIsWaite(false);
          setIsPaused(true);
        } else {
          pauseAudioPlayback();
        }
      }
      startContinuousWordPreview(word, wordIndex);
    }, 450);
  }, [
    cancelWordLongPress,
    clearRepeatTimer,
    isWaite,
    pauseAudioPlayback,
    sentence.playing,
    setHighlightedWord,
    startContinuousWordPreview,
    stopPauseHighlightTracking,
    wordBoundaries,
  ]);

  const handleWordClick = useCallback((wordIndex: number) => {
    cancelWordLongPress();
    if (suppressNextWordClickRef.current) {
      suppressNextWordClickRef.current = false;
      return;
    }
    if (continuousPreviewWordIndexRef.current === wordIndex) {
      stopWordPreview();
      return;
    }
    const word = wordBoundaries[wordIndex];
    if (!word) return;

    setHighlightedWord(wordIndex);
    activeWordIndexRef.current = wordIndex;
    if (!sentence.playing || isPaused) {
      resumeWordOffsetRef.current = word.offsetMs / 1000;
      void handlePlayCurrentWord(word, wordIndex);
      return;
    }

    if (isWaite) {
      clearRepeatTimer();
      stopPauseHighlightTracking();
      countdownCompleteRef.current = null;
      countdownEndAtRef.current = 0;
      countdownRemainingMsRef.current = 0;
      setPauseRemaining(0);
      setIsWaite(false);
      setIsPaused(true);
      resumeWordOffsetRef.current = word.offsetMs / 1000;
      void handlePlayCurrentWord(word, wordIndex);
      return;
    }

    void resumeAudioPlayback(word.offsetMs / 1000);
  }, [
    cancelWordLongPress,
    clearRepeatTimer,
    handlePlayCurrentWord,
    isPaused,
    isWaite,
    resumeAudioPlayback,
    sentence.playing,
    setHighlightedWord,
    stopPauseHighlightTracking,
    stopWordPreview,
    wordBoundaries,
  ]);

  const handleEnded = () => {
    stopHighlightTracking();
    setHighlightedWord(-1);
    sentence.onPlaybackCompleted(sentence.id);
    const audio = audioRef.current;
    const elapsedMs = playbackElapsedMsRef.current + (
      startedAtRef.current ? Date.now() - startedAtRef.current : 0
    );
    const elapsedSeconds = elapsedMs / 1000;
    const metadataSeconds = audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration / Math.max(0.1, sentence.rate || 1)
      : 0;
    const playbackSeconds = metadataSeconds || (
      Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 0
    );
    const pauseSeconds = playbackSeconds + Math.max(0, sentence.delay || 0);
    const currentCount = playCountRef.current;

    startedAtRef.current = 0;
    playbackElapsedMsRef.current = 0;

    if (playbackSeconds > 0) {
      setDuration(Number(playbackSeconds.toFixed(1)));
    }

    if (currentCount < maxCount) {
      waitBeforeContinue(pauseSeconds, () => {
        void playOnce(currentCount + 1);
      }, { speechDurationMs: playbackSeconds * 1000 });
      return;
    }

    if (sentence.hasNext) {
      waitBeforeContinue(pauseSeconds, () => {
        resetPlaybackState();
        sentence.onPlayEnd(sentence.index);
      }, { speechDurationMs: playbackSeconds * 1000 });
      return;
    }

    resetPlaybackState();
    sentence.onPlayEnd(sentence.index);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (audio && Number.isFinite(audio.duration)) {
      const playbackSeconds = audio.duration / Math.max(0.1, sentence.rate || 1);
      setDuration(Number(playbackSeconds.toFixed(1)));
    }
  };

  const playButtonLabel = !sentence.playing
    ? '播放句子'
    : isPaused
      ? '继续播放'
      : '暂停播放';

  return (
    <div
      id={articleSentenceElementId(sentence.id)}
      key={sentence.id}
      className={`${styles.sentenceItem} ${sentence.resumePoint ? styles.resumePoint : ''} ${sentence.depth ? styles.nestedSentence : ''}`}
      ref={itemRef}
      style={{ marginLeft: `${Math.min(sentence.depth || 0, 6) * 24}px` }}
    >
      <audio
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        ref={audioRef}
      />
      <div className={styles.sentenceLeadingControls}>
        {sentence.playable !== false && (
          <Button
            type="text"
            shape="circle"
            icon={sentence.playing && !isPaused ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handleTogglePlay}
            className={`${styles.sentencePlayButton} ${sentence.playing ? styles.sentencePlayButtonActive : ''}`}
            aria-label={`${playButtonLabel}，第 ${sentence.displayNumber} 句`}
          />
        )}
        <span className={styles.sentenceNumber} aria-hidden="true">{sentence.displayNumber}</span>
      </div>
      <div className={styles.sentenceContent}>
        {sentence.resumePoint && <span className={styles.resumeMarker}>上次停在这里</span>}
        <p className={styles.englishText}>
          {wordSegments.map((segment, segmentIndex) => {
            if (segment.wordIndex === undefined) {
              return <React.Fragment key={`text-${segmentIndex}`}>{segment.text}</React.Fragment>;
            }

            const wordIndex = segment.wordIndex;
            const className = [
              styles.word,
              wordIndex === activeWordIndex ? styles.activeWord : '',
              wordIndex === previewLoadingWordIndex ? styles.wordPreviewLoading : '',
              wordIndex === previewPlayingWordIndex ? styles.wordPreviewPlaying : '',
              wordIndex === continuousPreviewWordIndex ? styles.wordPreviewContinuous : '',
              previewedWordIndices.has(wordIndex) ? styles.previewedWord : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                type="button"
                className={`${styles.wordButton} ${className}`}
                key={`word-${wordIndex}`}
                onClick={() => handleWordClick(wordIndex)}
                onPointerDown={() => handleWordPointerDown(wordIndex)}
                onPointerUp={cancelWordLongPress}
                onPointerCancel={cancelWordLongPress}
                onPointerLeave={cancelWordLongPress}
                onContextMenu={(event) => event.preventDefault()}
                aria-label={wordIndex === continuousPreviewWordIndex ? `停止连续播放单词 ${segment.text}` : `播放或定位单词 ${segment.text}`}
                aria-busy={wordIndex === previewLoadingWordIndex || wordIndex === continuousPreviewWordIndex}
              >
                {segment.text}
              </button>
            );
          })}
        </p>
        <p className={styles.chineseText}>{sentence.translatedContent}</p>
        {sentence.hierarchyControl}
        {sentence.transientContent}
        <div className={styles.sentenceControls}>
          {sentence.playing ? (
            <span className={styles.playCount}>第{playCount || 1}/{maxCount}次</span>
          ) : null}
          <span className={styles.totalPlayCount}>播放量 {sentence.totalPlayCount}</span>
          {sentence.playing && !isWaite ? (
            isPaused ? <span className={styles.playbackPaused}>已暂停</span> : <SoundOutlined />
          ) : null}
          {!!duration && <span className={styles.duration}>{duration}秒</span>}
          {!!sentence.actions?.length && (
            <Button
              type="text"
              shape="circle"
              icon={<MoreOutlined />}
              className={`${styles.sentenceMoreButton} ${isActionPanelOpen ? styles.sentenceMoreButtonActive : ''}`}
              aria-label="更多句子操作"
              aria-expanded={isActionPanelOpen}
              onClick={() => setIsActionPanelOpen((open) => !open)}
            />
          )}
        </div>
        {isActionPanelOpen && sentence.actions?.length ? (
          <div className={styles.sentenceActionPanel} aria-label="句子操作区">
            {sentence.actions.map((action) => (
              <Button
                key={action.key}
                type="text"
                icon={action.icon}
                danger={action.danger}
                disabled={action.disabled}
                className={styles.sentenceActionButton}
                onClick={() => {
                  setIsActionPanelOpen(false);
                  action.onClick();
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      {sentence.playing && isWaite ? (
        <div
          className={styles.countdownRow}
          aria-label={`停顿倒计时 ${pauseRemaining.toFixed(1)} 秒${isPaused ? '，已暂停' : ''}`}
        >
          <AudioOutlined className={styles.countdownIcon} />
          <span className={styles.countdownLabel}>停顿倒计时</span>
          <strong className={styles.countdownValue}>{pauseRemaining.toFixed(1)}</strong>
          <span className={styles.countdownUnit}>秒</span>
          <span className={styles.countdownState}>{isPaused ? '暂停中' : '进行中'}</span>
        </div>
      ) : null}
    </div>
  );
}
