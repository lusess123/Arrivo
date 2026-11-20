import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { history, useLocation, useNavigate, useParams } from "@umijs/max";
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Segmented,
  Select,
  Slider,
  Spin,
  Switch,
  Tag,
  Tooltip
} from "antd";
import {
  ArrowDownOutlined,
  AudioOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  FullscreenOutlined,
  LeftOutlined,
  LogoutOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  DownOutlined,
  UpOutlined,
  ReloadOutlined,
  RightOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import styles from "./index.module.less";
import { translate, useLocale, type MessagePair } from "@/lib/locale";
import { readerError } from "./reader-error";
import { LanguageSwitch } from "@/components/language-switch";
import { asyncHandle } from "@/lib";
import { buildLoginUrl } from "@/lib/auth-redirect";
import axios from "axios";
import ens from "@/data/en.json";
import SentenceItem, { type SentenceActionItem } from "./sentence.item";
import { useApp } from "@/hooks";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  normalizePlaybackSettings,
  readCachedPlaybackSettings,
  resolvePlaybackCompletion,
  writeCachedPlaybackSettings,
  type PlaybackSettings
} from "./playback";
import { articleSentenceElementId } from "./article-progress";
import { useArticleProgress } from "./use-article-progress";
import { apiUrl } from "@/lib/api";
import { getAdjacentFocusIndex, resolveFocusIndex } from "./focus-reading";
import { resolveSentenceTextVisibility } from "./sentence-visibility";
import {
  buildSentenceTree,
  getPlayableSentences,
  getSentenceDisplayRows,
  getSentenceGroups,
  mergeGeneratedSentences,
  type SentenceDisplayRow,
  type SentenceNode
} from "./sentence-tree";
import {
  LEARNING_LANGUAGE_OPTIONS,
  type ArticleSentenceDto,
  type LearningLanguageCode,
  type SentenceTextVisibility,
  type SentenceSplitStatus
} from "@arrivo/contracts";

interface Sentence extends ArticleSentenceDto {
  duration?: number;
}

type SplitUiState = {
  analysis: string;
  temporaryChildren: Array<{
    originalContent: string;
    translatedContent: string;
  }>;
  loading: boolean;
  error?: { display: MessagePair; failedOutput: string; validationError: string };
};

interface ArticleNavigationState {
  autoPlay?: boolean;
}

const englishLanguageNames: Record<LearningLanguageCode, string> = { en: "English", vi: "Vietnamese", fi: "Finnish" };

function getVoiceOptions(languageCode: LearningLanguageCode) {
  if (languageCode === "en") {
    return ens.map((voice) => {
      const [, region, name] = voice.name.split("-");
      return { label: translate(voice["中文"], `${name.replace(/Neural$/, "")} · ${region} · ${voice.gender}`), value: voice.name };
    });
  }
  if (languageCode === "vi") return [
    { label: translate("越南语-怀美-女性", "Hoài My · Female"), value: "vi-VN-HoaiMyNeural" },
    { label: translate("越南语-南明-男性", "Nam Minh · Male"), value: "vi-VN-NamMinhNeural" }
  ];
  return [
    { label: translate("芬兰语-哈里-男性", "Harri · Male"), value: "fi-FI-HarriNeural" },
    { label: translate("芬兰语-诺拉-女性", "Noora · Female"), value: "fi-FI-NooraNeural" }
  ];
}

const ArticlePage: React.FC = () => {
  const { locale, t } = useLocale();
  const router = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { auth } = useApp();
  const [sentenceForm] = Form.useForm();
  const [article, setArticle] = useState<any>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [sentenceModalOpen, setSentenceModalOpen] = useState(false);
  const [editingSentence, setEditingSentence] = useState<Sentence | null>(null);
  const [sentenceInsertIndex, setSentenceInsertIndex] = useState<number | null>(null);
  const [sentenceGroupId, setSentenceGroupId] = useState<string | null>(null);
  const [savingSentence, setSavingSentence] = useState(false);
  const [generatingLanguages, setGeneratingLanguages] = useState<Set<LearningLanguageCode>>(new Set());
  const [languageGenerationErrors, setLanguageGenerationErrors] = useState<
    Partial<Record<LearningLanguageCode, MessagePair>>
  >({});
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(() => ({
    ...DEFAULT_PLAYBACK_SETTINGS,
    voices: { ...DEFAULT_PLAYBACK_SETTINGS.voices, en: ens[0].name }
  }));
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [selectedFocusSentenceId, setSelectedFocusSentenceId] = useState<string | null>(null);
  const [sentencePaused, setSentencePaused] = useState(false);
  const [playbackSession, setPlaybackSession] = useState(0);
  const [continuousPlayback, setContinuousPlayback] = useState(false);
  const [expandedSentenceIds, setExpandedSentenceIds] = useState<Set<string>>(new Set());
  const [sentenceVisibilityById, setSentenceVisibilityById] = useState<
    Record<string, SentenceTextVisibility>
  >({});
  const [sentenceVisibilityLoaded, setSentenceVisibilityLoaded] = useState(false);
  const [splitUiBySentence, setSplitUiBySentence] = useState<Record<string, SplitUiState>>({});
  const [regeneratingSentence, setRegeneratingSentence] = useState<SentenceNode | null>(null);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");
  const [regenerationFailure, setRegenerationFailure] = useState<SplitUiState["error"]>();
  const [listeningFeedback, setListeningFeedback] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const playbackSettingsRef = useRef(playbackSettings);
  const sentencePlayCountQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sentenceWordPlayQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sentenceVisibilitySaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const settingsTouchedRef = useRef(false);
  const settingsSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const restoredArticleRef = useRef<string | null>(null);
  const languageGenerationAttemptRef = useRef(new Set<string>());
  const languageGenerationRequestRef = useRef(new Map<string, symbol>());
  const currentUserId = (auth?.userData as any)?.id;
  const activeLanguage = playbackSettings.activeLanguage;
  const sentenceTree = useMemo(
    () => buildSentenceTree(sentences, activeLanguage),
    [activeLanguage, sentences]
  );
  const sentenceGroups = useMemo(() => getSentenceGroups(sentences), [sentences]);
  const languageSections = useMemo(() => {
    const rootByGroup = new Map(sentenceTree.map((root) => [root.sentenceGroupId, root]));
    return sentenceGroups.map((group, index) => {
      const root = rootByGroup.get(group.sentenceGroupId);
      return {
        ...group,
        rows: root ? getSentenceDisplayRows([root], expandedSentenceIds, index) : []
      };
    });
  }, [expandedSentenceIds, sentenceGroups, sentenceTree]);
  const missingSentenceGroups = useMemo(
    () => languageSections.filter((section) => !section.rows.length),
    [languageSections]
  );
  const hasSentenceGroups = sentences.some((sentence) => sentence.parentSentenceId === null);
  const activeLanguageOption = LEARNING_LANGUAGE_OPTIONS.find(
    (language) => language.code === activeLanguage
  )!;
  const learningLanguageName = t(activeLanguageOption.label, englishLanguageNames[activeLanguage]);
  const isGeneratingActiveLanguage = generatingLanguages.has(activeLanguage);
  const generationError = languageGenerationErrors[activeLanguage];
  const activeLanguageGenerationError = generationError && t(...generationError);
  const displayRows = useMemo(
    () => languageSections.flatMap((section) => section.rows),
    [languageSections]
  );
  const playableSentences = useMemo(() => getPlayableSentences(displayRows), [displayRows]);
  const displayRowBySentenceId = useMemo(
    () => new Map(displayRows.map((row) => [row.sentence.id, row])),
    [displayRows]
  );
  const sentenceIds = useMemo(
    () => playableSentences.map((sentence) => sentence.id),
    [playableSentences]
  );
  const sentenceById = useMemo(
    () => new Map(sentences.map((sentence) => [sentence.id, sentence])),
    [sentences]
  );
  const {
    loaded: progressLoaded,
    resumeIndex: directResumeIndex,
    resumeSentenceId,
    save: saveArticleProgress,
    clear: clearArticleProgress
  } = useArticleProgress({ articleId: id, userId: currentUserId, sentenceIds });
  const resumeIndex = useMemo(() => {
    if (directResumeIndex !== null || !resumeSentenceId) return directResumeIndex;
    let current = sentenceById.get(resumeSentenceId);
    while (current?.parentSentenceId) {
      const parentIndex = sentenceIds.indexOf(current.parentSentenceId);
      if (parentIndex >= 0) return parentIndex;
      current = sentenceById.get(current.parentSentenceId);
    }
    return null;
  }, [directResumeIndex, resumeSentenceId, sentenceById, sentenceIds]);
  const focusIndex = useMemo(
    () =>
      resolveFocusIndex({
        activeIndex: activeSentenceIndex,
        selectedSentenceId: selectedFocusSentenceId,
        resumeIndex,
        sentences: playableSentences
      }),
    [activeSentenceIndex, playableSentences, resumeIndex, selectedFocusSentenceId]
  );
  const focusedSentence = focusIndex === null ? null : playableSentences[focusIndex];
  const focusedRow = focusedSentence
    ? (displayRowBySentenceId.get(focusedSentence.id) ?? null)
    : null;
  const canEdit = useMemo(
    () => Boolean(article && article.userId === currentUserId && !article.isPublic),
    [article, currentUserId]
  );
  const isFocusMode = playbackSettings.readingMode === "focus";

  const updatePlaybackSettings = useCallback((patch: Partial<PlaybackSettings>) => {
    const nextSettings = normalizePlaybackSettings(
      { ...playbackSettingsRef.current, ...patch },
      ens[0].name
    );
    settingsTouchedRef.current = true;
    playbackSettingsRef.current = nextSettings;
    setPlaybackSettings(nextSettings);
    return nextSettings;
  }, []);

  const applyLoadedPlaybackSettings = useCallback((settings: PlaybackSettings) => {
    if (settingsTouchedRef.current) return;
    playbackSettingsRef.current = settings;
    setPlaybackSettings(settings);
  }, []);

  const persistPlaybackSettings = useCallback(
    (settings: PlaybackSettings) => {
      if (currentUserId === undefined || currentUserId === null) return;

      const userId = currentUserId;
      settingsSaveQueueRef.current = settingsSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const [err] = await asyncHandle(axios.put("/api/user/playback-settings", settings));
          if (err) {
            if (err.response?.status !== 401) {
              message.error(translate(...readerError(err.response?.data, ["播放设置保存失败，请重试。", "Could not save playback settings. Please retry."])));
            }
            return;
          }

          writeCachedPlaybackSettings(userId, settings);
        });
    },
    [currentUserId]
  );

  const changeActiveLanguage = useCallback((languageCode: LearningLanguageCode) => {
    if (!playbackSettingsRef.current.learningLanguages.includes(languageCode)) return;
    setActiveSentenceIndex(null);
    setContinuousPlayback(false);
    setSentencePaused(false);
    setPlaybackSession((session) => session + 1);
    setSelectedFocusSentenceId(null);
    restoredArticleRef.current = null;
    const nextSettings = updatePlaybackSettings({ activeLanguage: languageCode });
    persistPlaybackSettings(nextSettings);
  }, [persistPlaybackSettings, updatePlaybackSettings]);

  const applyArticleData = useCallback((
    articleData: any,
    mergeGenerated: LearningLanguageCode | null = null
  ) => {
    setArticle(articleData);
    const normalizedSentences = (articleData?.Sentences || []).map((sentence: any) => ({
        ...sentence,
        originalContent: sentence.originalContent || "",
        translatedContent: sentence.translatedContent || "",
        languageCode: sentence.languageCode || "en",
        sentenceGroupId: sentence.sentenceGroupId || sentence.id,
        parentSentenceId: sentence.parentSentenceId || null,
        splitStatus: (sentence.splitStatus || "UNKNOWN") as SentenceSplitStatus,
        playedWordIndexes: Array.isArray(sentence.playedWordIndexes)
          ? sentence.playedWordIndexes
          : []
      }));
    setSentences((current) => mergeGenerated
      ? mergeGeneratedSentences(current, normalizedSentences, mergeGenerated)
      : normalizedSentences);
    setActiveSentenceIndex(null);
    setSelectedFocusSentenceId(null);
    setSentencePaused(false);
  }, []);

  const generateMissingLanguage = useCallback(async (
    languageCode: LearningLanguageCode,
    retry = false
  ) => {
    if (!id || languageCode === "en") return;
    const groups = getSentenceGroups(sentences);
    const existingGroups = new Set(
      sentences
        .filter((sentence) => sentence.parentSentenceId === null && sentence.languageCode === languageCode)
        .map((sentence) => sentence.sentenceGroupId)
    );
    if (!groups.length || groups.every((group) => existingGroups.has(group.sentenceGroupId))) return;

    const attemptKey = `${id}:${languageCode}`;
    if (!retry && languageGenerationAttemptRef.current.has(attemptKey)) return;
    languageGenerationAttemptRef.current.add(attemptKey);
    const requestId = Symbol(attemptKey);
    languageGenerationRequestRef.current.set(attemptKey, requestId);
    setGeneratingLanguages((languages) => new Set(languages).add(languageCode));
    setLanguageGenerationErrors((errors) => {
      if (errors[languageCode] === undefined) return errors;
      const next = { ...errors };
      delete next[languageCode];
      return next;
    });
    const [err, res] = await asyncHandle(
      axios.post(`/api/articles/${encodeURIComponent(id)}/languages/${languageCode}/generate`)
    );
    if (languageGenerationRequestRef.current.get(attemptKey) !== requestId) return;
    if (err) {
      setLanguageGenerationErrors((errors) => ({
        ...errors,
        [languageCode]: readerError(err.response?.data, ["语言内容生成失败，请重试。", "Could not generate this language. Please retry."])
      }));
    } else {
      applyArticleData(res?.data?.data, languageCode);
    }
    setGeneratingLanguages((languages) => {
      const next = new Set(languages);
      next.delete(languageCode);
      return next;
    });
    languageGenerationRequestRef.current.delete(attemptKey);
  }, [applyArticleData, id, sentences]);

  const fetchArticle = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    const [err, res] = await asyncHandle(
      axios.get(`/api/article/getArticleDetail`, {
        params: {
          id
        }
      })
    );

    if (err) {
      if (err.response?.status !== 401) {
        message.error(translate(...readerError(err.response?.data, ["文章载入失败，请检查网络后重试。", "Could not load the article. Check your connection and retry."])));
      }
      setLoading(false);
      return;
    }

    applyArticleData(res?.data?.data);
    void asyncHandle(axios.post("/api/article/incrementPlayCount", { id }));
    setLoading(false);
  }, [applyArticleData, id]);

  const handleLogout = async () => {
    const [err] = await asyncHandle(axios.post("/api/auth/signout"));
    if (err) {
      message.error(translate(...readerError(err.response?.data, ["退出登录失败，请重试。", "Could not sign out. Please retry."])));
    } else {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      await auth.saveLastVisitedPage(currentPath);
      await auth.clearUser?.();
      history.replace(buildLoginUrl(currentPath));
    }
  };

  useEffect(() => {
    setActiveSentenceIndex(null);
    setContinuousPlayback(false);
    restoredArticleRef.current = null;
    languageGenerationAttemptRef.current.clear();
    languageGenerationRequestRef.current.clear();
    setGeneratingLanguages(new Set());
    setLanguageGenerationErrors({});
    void fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    if (!article || loading) return;
    void generateMissingLanguage(activeLanguage);
  }, [activeLanguage, article, generateMissingLanguage, loading]);

  useEffect(() => {
    if (!id || currentUserId === undefined || currentUserId === null) return;
    const controller = new AbortController();
    void fetch(apiUrl(`/api/user/articles/${encodeURIComponent(id)}/sentence-expansion`), {
      credentials: "include",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Expansion state failed: ${response.status}`);
        const body = (await response.json()) as {
          data?: { expandedSentenceIds?: string[] };
        };
        if (!controller.signal.aborted) {
          setExpandedSentenceIds(new Set(body.data?.expandedSentenceIds || []));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setExpandedSentenceIds(new Set());
      });
    return () => controller.abort();
  }, [currentUserId, id]);

  useEffect(() => {
    setSentenceVisibilityById({});
    setSentenceVisibilityLoaded(false);
    if (!id || currentUserId === undefined || currentUserId === null) return;

    const controller = new AbortController();
    void fetch(apiUrl(`/api/user/articles/${encodeURIComponent(id)}/sentence-visibility`), {
      credentials: "include",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Sentence visibility failed: ${response.status}`);
        const body = (await response.json()) as {
          data?: { visibilityBySentenceId?: Record<string, SentenceTextVisibility> };
        };
        if (!controller.signal.aborted) {
          setSentenceVisibilityById(body.data?.visibilityBySentenceId || {});
          setSentenceVisibilityLoaded(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSentenceVisibilityById({});
          setSentenceVisibilityLoaded(true);
        }
      });

    return () => controller.abort();
  }, [currentUserId, id]);

  useLayoutEffect(() => {
    if (!id || loading || !progressLoaded || restoredArticleRef.current === id) {
      return;
    }

    if (resumeIndex === null) return;
    const sentence = playableSentences[resumeIndex];
    if (!sentence) return;
    restoredArticleRef.current = id;

    document.getElementById(articleSentenceElementId(sentence.id))?.scrollIntoView({
      behavior: "auto",
      block: "center"
    });
  }, [id, loading, playableSentences, progressLoaded, resumeIndex]);

  useEffect(() => {
    if (activeSentenceIndex === null) return;
    const sentence = playableSentences[activeSentenceIndex];
    if (sentence) saveArticleProgress(sentence.id);
  }, [activeSentenceIndex, playableSentences, saveArticleProgress]);

  useEffect(() => {
    if (currentUserId === undefined || currentUserId === null) return;

    settingsTouchedRef.current = false;
    const cachedSettings = readCachedPlaybackSettings(currentUserId, ens[0].name);
    if (cachedSettings) {
      applyLoadedPlaybackSettings(cachedSettings);
    }

    const controller = new AbortController();
    void (async () => {
      const [err, res] = await asyncHandle(
        axios.get("/api/user/playback-settings", {
          signal: controller.signal
        })
      );
      if (controller.signal.aborted) return;

      if (err) {
        if (!cachedSettings && err.response?.status !== 401) {
          message.warning(translate("播放设置暂时无法同步，已使用默认设置", "Playback settings could not sync. Using the defaults."));
        }
        return;
      }

      if (settingsTouchedRef.current) return;
      const serverSettings = normalizePlaybackSettings(res?.data?.data, ens[0].name);
      writeCachedPlaybackSettings(currentUserId, serverSettings);
      applyLoadedPlaybackSettings(serverSettings);
    })();

    return () => controller.abort();
  }, [applyLoadedPlaybackSettings, currentUserId]);

  const handleGoBack = () => {
    router(-1);
  };

  const handleOpenSettings = () => {
    setIsSettingsModalVisible(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsModalVisible(false);
  };

  const changeReadingMode = useCallback(
    (mode: PlaybackSettings["readingMode"]) => {
      const sentenceId = focusedSentence?.id ?? null;
      if (sentenceId) setSelectedFocusSentenceId(sentenceId);
      const nextSettings = updatePlaybackSettings({ readingMode: mode });
      persistPlaybackSettings(nextSettings);

      if (mode === "list" && sentenceId) {
        window.requestAnimationFrame(() => {
          document
            .getElementById(articleSentenceElementId(sentenceId))
            ?.scrollIntoView({ behavior: "auto", block: "center" });
        });
      }
    },
    [focusedSentence?.id, persistPlaybackSettings, updatePlaybackSettings]
  );

  const handleFocusNavigate = useCallback(
    (direction: -1 | 1) => {
      if (focusIndex === null) return;
      const nextIndex = getAdjacentFocusIndex(focusIndex, direction, playableSentences.length);
      if (nextIndex === null) return;
      const nextSentence = playableSentences[nextIndex];
      if (!nextSentence) return;

      setSelectedFocusSentenceId(nextSentence.id);
      if (activeSentenceIndex !== null && !sentencePaused) {
        setSentencePaused(false);
        setActiveSentenceIndex(nextIndex);
        return;
      }
      if (activeSentenceIndex !== null) {
        setActiveSentenceIndex(null);
        setSentencePaused(false);
      }
    },
    [activeSentenceIndex, focusIndex, playableSentences, sentencePaused]
  );

  const handleSentencePlayStart = useCallback(
    (index: number) => {
      setContinuousPlayback(false);
      setSentencePaused(false);
      setSelectedFocusSentenceId(playableSentences[index]?.id ?? null);
      setActiveSentenceIndex(index);
    },
    [playableSentences]
  );

  const handleSentencePlayStop = useCallback((index: number) => {
    setContinuousPlayback(false);
    setSentencePaused(false);
    setActiveSentenceIndex((currentIndex) => (currentIndex === index ? null : currentIndex));
  }, []);

  const handleSentencePlaybackCompleted = useCallback((sentenceId: string) => {
    setSentences((current) =>
      current.map((sentence) =>
        sentence.id === sentenceId ? { ...sentence, playCount: sentence.playCount + 1 } : sentence
      )
    );

    sentencePlayCountQueueRef.current = sentencePlayCountQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const [err, res] = await asyncHandle(
          axios.post("/api/article/incrementSentencePlayCount", {
            id: sentenceId
          })
        );
        if (err) {
          setSentences((current) =>
            current.map((sentence) =>
              sentence.id === sentenceId
                ? {
                    ...sentence,
                    playCount: Math.max(0, sentence.playCount - 1)
                  }
                : sentence
            )
          );
          message.error(translate(...readerError(err.response?.data, ["句子播放量更新失败", "Could not update the play count."])));
          return;
        }

        const playCount = res?.data?.data?.playCount;
        if (typeof playCount !== "number") return;
        setSentences((current) =>
          current.map((sentence) =>
            sentence.id === sentenceId ? { ...sentence, playCount } : sentence
          )
        );
      });
  }, []);

  const handleSentenceWordPreviewed = useCallback((sentenceId: string, wordIndex: number) => {
    setSentences((current) =>
      current.map((sentence) =>
        sentence.id === sentenceId && !sentence.playedWordIndexes.includes(wordIndex)
          ? {
              ...sentence,
              playedWordIndexes: [...sentence.playedWordIndexes, wordIndex]
            }
          : sentence
      )
    );

    sentenceWordPlayQueueRef.current = sentenceWordPlayQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const [err, res] = await asyncHandle(
          axios.post("/api/article/recordSentenceWordPlay", {
            id: sentenceId,
            wordIndex
          })
        );
        if (err) {
          if (err.response?.status !== 401) {
            message.error(translate(...readerError(err.response?.data, ["单词播放记录保存失败", "Could not save word playback history."])));
          }
          return;
        }

        const playedWordIndexes = res?.data?.data?.playedWordIndexes;
        if (!Array.isArray(playedWordIndexes)) return;
        setSentences((current) =>
          current.map((sentence) =>
            sentence.id === sentenceId ? { ...sentence, playedWordIndexes } : sentence
          )
        );
      });
  }, []);

  const handleSentencePlayEnd = useCallback(
    (index: number) => {
      if (activeSentenceIndex !== index) return;

      const completion = resolvePlaybackCompletion({
        sentenceIndex: index,
        sentenceCount: playableSentences.length,
        nextArticleId: article?.nextArticleId,
        continuous: continuousPlayback
      });

      if (completion.type === "next-sentence") {
        setSentencePaused(false);
        setActiveSentenceIndex(completion.sentenceIndex);
        return;
      }

      setActiveSentenceIndex(null);
      setSentencePaused(false);
      setContinuousPlayback(false);

      if (completion.type === "next-article") {
        clearArticleProgress();
        router(`/article/${encodeURIComponent(completion.articleId)}`, {
          state: { autoPlay: true } satisfies ArticleNavigationState
        });
        return;
      }

      if (completion.type === "all-complete") {
        clearArticleProgress();
        message.success(translate("已播放完全部文章", "You’ve finished all articles."));
      }
    },
    [
      activeSentenceIndex,
      article?.nextArticleId,
      clearArticleProgress,
      continuousPlayback,
      playableSentences.length,
      router
    ]
  );

  const startContinuousPlayback = useCallback(
    (sentenceIndex: number) => {
      if (isGeneratingActiveLanguage || missingSentenceGroups.length) {
        message.info(translate(`${activeLanguageOption.label}内容生成完成后即可播放`, `Playback will be available once the ${englishLanguageNames[activeLanguage]} text is ready.`));
        return;
      }
      if (!playableSentences.length) {
        message.info(translate("暂无可朗读内容", "There is nothing to play yet."));
        return;
      }

      setPlaybackSession((session) => session + 1);
      setContinuousPlayback(true);
      setSentencePaused(false);
      setActiveSentenceIndex(sentenceIndex);
    },
    [
      activeLanguageOption.label,
      isGeneratingActiveLanguage,
      missingSentenceGroups.length,
      playableSentences.length
    ]
  );

  const handleContinuePlayback = useCallback(() => {
    startContinuousPlayback(resumeIndex ?? 0);
  }, [resumeIndex, startContinuousPlayback]);

  const handlePlayFromBeginning = useCallback(() => {
    startContinuousPlayback(0);
  }, [startContinuousPlayback]);

  useEffect(() => {
    const navigationState = location.state as ArticleNavigationState | null;
    if (
      loading ||
      !progressLoaded ||
      !navigationState?.autoPlay ||
      !article ||
      String(article.id) !== String(id)
    ) {
      return;
    }

    if (activeLanguage !== "en" && missingSentenceGroups.length) {
      if (!activeLanguageGenerationError) return;
      router(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: null
      });
      message.info(translate("下一篇语言内容生成失败，连续播放已停止", "Continuous playback stopped because the next article could not be prepared."));
      return;
    }

    if (!playableSentences.length) {
      router(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: null
      });
      message.info(translate("下一篇暂无可朗读内容", "The next article has nothing to play yet."));
      return;
    }

    router(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null
    });

    setPlaybackSession((session) => session + 1);
    setContinuousPlayback(true);
    setActiveSentenceIndex(resumeIndex ?? 0);
  }, [
    article,
    activeLanguage,
    id,
    loading,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    activeLanguageGenerationError,
    missingSentenceGroups.length,
    playableSentences.length,
    progressLoaded,
    resumeIndex,
    router
  ]);

  const persistExpansion = useCallback(
    async (sentenceId: string, expanded: boolean) => {
      if (!id) return;
      const [err] = await asyncHandle(
        axios.patch(`/api/user/articles/${encodeURIComponent(id)}/sentence-expansion`, {
          sentenceId,
          expanded
        })
      );
      if (err) message.warning(translate("展开状态暂未同步", "Your expanded sections haven’t synced yet."));
    },
    [id]
  );

  const setSentenceExpanded = useCallback(
    (sentenceId: string, expanded: boolean) => {
      setActiveSentenceIndex(null);
      setContinuousPlayback(false);
      setExpandedSentenceIds((current) => {
        const next = new Set(current);
        if (expanded) next.add(sentenceId);
        else next.delete(sentenceId);
        return next;
      });
      void persistExpansion(sentenceId, expanded);
    },
    [persistExpansion]
  );

  const persistSentenceVisibility = useCallback(
    (sentenceId: string, visibility: SentenceTextVisibility) => {
      if (!id) return;
      sentenceVisibilitySaveQueueRef.current = sentenceVisibilitySaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const [err] = await asyncHandle(
            axios.patch(`/api/user/articles/${encodeURIComponent(id)}/sentence-visibility`, {
              sentenceId,
              ...visibility
            })
          );
          if (err && err.response?.status !== 401) {
            message.warning(translate("单句显示偏好暂未同步", "Your display choices haven’t synced yet."));
          }
        });
    },
    [id]
  );

  const updateSentenceVisibility = useCallback(
    (sentenceId: string, visibility: SentenceTextVisibility) => {
      setSentenceVisibilityById((current) => ({
        ...current,
        [sentenceId]: visibility
      }));
      persistSentenceVisibility(sentenceId, visibility);
    },
    [persistSentenceVisibility]
  );

  const updateSplitUi = useCallback(
    (sentenceId: string, update: (state: SplitUiState) => SplitUiState) => {
      setSplitUiBySentence((current) => ({
        ...current,
        [sentenceId]: update(
          current[sentenceId] || {
            analysis: "",
            temporaryChildren: [],
            loading: false
          }
        )
      }));
    },
    []
  );

  const handleSplitEvent = useCallback(
    (sentenceId: string, eventName: string, payload: any) => {
      if (eventName === "started") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          loading: true,
          error: undefined
        }));
        return;
      }
      if (eventName === "retrying") {
        updateSplitUi(sentenceId, () => ({
          analysis: "",
          temporaryChildren: [],
          loading: true
        }));
        message.info(translate(...readerError(payload, ["结果不合格，正在自动重新生成", "The result did not pass validation. Retrying…"])));
        return;
      }
      if (eventName === "analysis_delta") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          analysis: state.analysis + (payload.text || "")
        }));
        return;
      }
      if (eventName === "child_started") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          temporaryChildren: state.temporaryChildren[payload.index]
            ? state.temporaryChildren
            : [...state.temporaryChildren, { originalContent: "", translatedContent: "" }]
        }));
        window.setTimeout(() => {
          updateSplitUi(sentenceId, (state) => ({ ...state, analysis: "" }));
        }, 800);
        return;
      }
      if (eventName === "original_delta" || eventName === "translation_delta") {
        updateSplitUi(sentenceId, (state) => {
          const temporaryChildren = [...state.temporaryChildren];
          const child = temporaryChildren[payload.index] || {
            originalContent: "",
            translatedContent: ""
          };
          temporaryChildren[payload.index] = {
            ...child,
            [eventName === "original_delta" ? "originalContent" : "translatedContent"]:
              child[eventName === "original_delta" ? "originalContent" : "translatedContent"] +
              (payload.text || "")
          };
          return { ...state, temporaryChildren };
        });
        return;
      }
      if (eventName === "child_completed") {
        updateSplitUi(sentenceId, (state) => {
          const temporaryChildren = [...state.temporaryChildren];
          temporaryChildren[payload.index] = payload.child;
          return { ...state, temporaryChildren };
        });
        return;
      }
      if (eventName === "committed") {
        setSentences((current) => {
          const parent = current.find((item) => item.id === sentenceId);
          const descendants = new Set<string>();
          let changed = true;
          while (changed) {
            changed = false;
            for (const item of current) {
              if (
                item.parentSentenceId === sentenceId ||
                (item.parentSentenceId && descendants.has(item.parentSentenceId))
              ) {
                if (!descendants.has(item.id)) {
                  descendants.add(item.id);
                  changed = true;
                }
              }
            }
          }
          const retained = current
            .filter((item) => !descendants.has(item.id))
            .map((item) =>
              item.id === sentenceId
                ? { ...item, splitStatus: "SPLIT" as SentenceSplitStatus }
                : item
            );
          const children: Sentence[] = (payload.children || []).map((child: any) => ({
            id: child.id,
            originalContent: child.originalContent || "",
            translatedContent: child.translatedContent || "",
            languageCode: parent?.languageCode || "en",
            sentenceGroupId: parent?.sentenceGroupId || sentenceId,
            parentSentenceId: sentenceId,
            sortOrder: child.sortOrder,
            splitStatus: (child.splittable ? "SPLITTABLE" : "UNSPLITTABLE") as SentenceSplitStatus,
            playCount: 0,
            playedWordIndexes: []
          }));
          return [...retained, ...children];
        });
        setExpandedSentenceIds((current) => new Set(current).add(sentenceId));
        void persistExpansion(sentenceId, true);
        updateSplitUi(sentenceId, () => ({
          analysis: "",
          temporaryChildren: [],
          loading: false
        }));
        return;
      }
      if (eventName === "unsplittable") {
        setSentences((current) => {
          const descendants = new Set<string>();
          let changed = true;
          while (changed) {
            changed = false;
            for (const item of current) {
              if (
                item.parentSentenceId === sentenceId ||
                (item.parentSentenceId && descendants.has(item.parentSentenceId))
              ) {
                if (!descendants.has(item.id)) {
                  descendants.add(item.id);
                  changed = true;
                }
              }
            }
          }
          return current
            .filter((item) => !descendants.has(item.id))
            .map((item) =>
              item.id === sentenceId
                ? {
                    ...item,
                    splitStatus: "UNSPLITTABLE" as SentenceSplitStatus
                  }
                : item
            );
        });
        setExpandedSentenceIds((current) => {
          const next = new Set(current);
          next.delete(sentenceId);
          return next;
        });
        updateSplitUi(sentenceId, () => ({
          analysis: "",
          temporaryChildren: [],
          loading: false
        }));
        message.info(translate("这个句子已经不适合继续切分", "This sentence cannot be split any further."));
        return;
      }
      if (eventName === "failed") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          loading: false,
          error: {
            display: readerError(payload, ["句子切分失败，请重试。", "Could not split the sentence. Please retry."]),
            failedOutput: payload.failedOutput || "",
            validationError: payload.validationError || payload.message || "句子切分失败"
          }
        }));
      }
    },
    [persistExpansion, updateSplitUi]
  );

  const startSentenceSplit = useCallback(
    async (
      sentence: SentenceNode,
      options?: {
        feedback?: string;
        force?: {
          targetCount: 2 | 3 | "auto";
          instruction: string;
          failedOutput?: string;
          validationError?: string;
        };
      }
    ) => {
      if (!id) return;
      if (!options && (sentence.children.length > 0 || sentence.splitStatus === "SPLIT")) {
        setSentenceExpanded(sentence.id, !expandedSentenceIds.has(sentence.id));
        return;
      }

      updateSplitUi(sentence.id, () => ({
        analysis: "",
        temporaryChildren: [],
        loading: true,
        error: undefined
      }));
      try {
        const action = options?.feedback
          ? "regenerate-stream"
          : options?.force
            ? "force-split-stream"
            : "split-stream";
        const response = await fetch(
          apiUrl(
            `/api/articles/${encodeURIComponent(id)}/sentences/${encodeURIComponent(sentence.id)}/${action}`
          ),
          {
            method: "POST",
            credentials: "include",
            ...(options
              ? {
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(
                    options.feedback ? { feedback: options.feedback } : options.force
                  )
                }
              : {})
          }
        );
        if (!response.ok || !response.body) {
          const problem = await response.json().catch(() => null);
          updateSplitUi(sentence.id, (state) => ({
            ...state,
            loading: false,
            error: {
              display: readerError(problem, [`句子切分请求失败（${response.status}），请重试。`, `Could not split the sentence (${response.status}). Please retry.`]),
              failedOutput: "",
              validationError: problem?.message || `HTTP ${response.status}`
            }
          }));
          return;
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value.replace(/\r\n/g, "\n");
          let boundary = buffer.indexOf("\n\n");
          while (boundary >= 0) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const eventName = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
            const data = block.match(/^data:\s*(.+)$/m)?.[1];
            if (eventName && data) handleSplitEvent(sentence.id, eventName, JSON.parse(data));
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "";
        updateSplitUi(sentence.id, (state) => ({
          ...state,
          loading: false,
          error: {
            display: readerError({ message: errorMessage }, ["句子切分中断，请检查网络后重试。", "Sentence splitting was interrupted. Check your connection and retry."]),
            failedOutput: JSON.stringify(state.temporaryChildren),
            validationError: errorMessage || "句子切分失败"
          }
        }));
      }
    },
    [expandedSentenceIds, handleSplitEvent, id, setSentenceExpanded, updateSplitUi]
  );

  const submitRegeneration = useCallback(() => {
    const feedback = regenerationFeedback.trim();
    if (!regeneratingSentence) return;
    const sentence = regeneratingSentence;
    const failure = regenerationFailure;
    speechRecognitionRef.current?.stop();
    setRegeneratingSentence(null);
    setRegenerationFailure(undefined);
    setRegenerationFeedback("");
    if (failure) {
      void startSentenceSplit(sentence, {
        force: {
          targetCount: "auto",
          instruction: feedback,
          failedOutput: failure.failedOutput,
          validationError: failure.validationError
        }
      });
    } else {
      void startSentenceSplit(sentence, { feedback });
    }
  }, [regeneratingSentence, regenerationFailure, regenerationFeedback, startSentenceSplit]);

  const toggleFeedbackSpeech = useCallback(() => {
    if (listeningFeedback) {
      speechRecognitionRef.current?.stop();
      return;
    }
    const Recognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = locale;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results as any[])
        .map((result: any) => result[0]?.transcript || "")
        .join("");
      setRegenerationFeedback(text.slice(0, 1000));
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setListeningFeedback(false);
    };
    recognition.onerror = () => {
      speechRecognitionRef.current = null;
      setListeningFeedback(false);
    };
    speechRecognitionRef.current = recognition;
    setListeningFeedback(true);
    recognition.start();
  }, [listeningFeedback, locale]);

  const openCreateSentence = (insertIndex: number, targetSentenceGroupId?: string) => {
    if (!canEdit) return;
    setEditingSentence(null);
    setSentenceInsertIndex(insertIndex);
    setSentenceGroupId(targetSentenceGroupId ?? null);
    sentenceForm.setFieldsValue({
      original: "",
      translation: ""
    });
    setSentenceModalOpen(true);
  };

  const openEditSentence = (sentence: Sentence) => {
    if (!canEdit) return;
    setEditingSentence(sentence);
    setSentenceInsertIndex(null);
    setSentenceGroupId(sentence.sentenceGroupId);
    sentenceForm.setFieldsValue({
      original: sentence.originalContent,
      translation: sentence.translatedContent
    });
    setSentenceModalOpen(true);
  };

  const closeSentenceModal = () => {
    setSentenceModalOpen(false);
    setEditingSentence(null);
    setSentenceInsertIndex(null);
    setSentenceGroupId(null);
    sentenceForm.resetFields();
  };

  const handleSaveSentence = async () => {
    if (!id) return;

    const values = await sentenceForm.validateFields();
    const original = values.original?.trim() || "";
    const translation = values.translation?.trim() || "";
    if (!original && !translation) {
      message.info(translate("请至少填写学习语言内容或中文释义", "Enter the sentence or its Chinese translation."));
      return;
    }

    setSavingSentence(true);

    try {
      const endpoint = editingSentence
        ? "/api/article/updateSentence"
        : "/api/article/createSentence";
      const payload = editingSentence
        ? {
            id: editingSentence.id,
            original,
            translation
          }
        : {
            articleId: id,
            languageCode: activeLanguage,
            ...(sentenceGroupId ? { sentenceGroupId } : {}),
            original,
            translation,
            insertIndex: sentenceInsertIndex ?? sentenceGroups.length
          };
      const [err, res] = await asyncHandle(axios.post(endpoint, payload));

      if (err) {
        message.error(translate(...readerError(err.response?.data, ["句子保存失败，请重试。", "Could not save the sentence. Please retry."])));
        return;
      }

      applyArticleData(res?.data?.data);
      closeSentenceModal();
      message.success(editingSentence ? translate("句子已更新", "Sentence updated.") : translate("句子已添加", "Sentence added."));
    } finally {
      setSavingSentence(false);
    }
  };

  const mutateSentence = async (
    endpoint: string,
    payload: Record<string, any>,
    successText: string
  ) => {
    const [err, res] = await asyncHandle(axios.post(endpoint, payload));

    if (err) {
      message.error(translate(...readerError(err.response?.data, ["句子更新失败，请重新载入文章后重试。", "Could not update the sentence. Reload the article and retry."])));
      return;
    }

    applyArticleData(res?.data?.data);
    message.success(successText);
  };

  const renderSentenceActions = (sentence: SentenceNode, rootIndex: number) => {
    const splitUi = splitUiBySentence[sentence.id];
    const items: SentenceActionItem[] = [];

    if (!splitUi?.loading && sentence.splitStatus !== "SPLITTING") {
      if (sentence.children.length > 0 || sentence.splitStatus === "SPLIT") {
        items.push({
          key: "regenerate",
          icon: <ReloadOutlined />,
          label: t("重新生成子句", "Regenerate parts"),
          onClick: () => {
            setRegeneratingSentence(sentence);
            setRegenerationFailure(undefined);
            setRegenerationFeedback("");
          }
        });
      } else {
        items.push({
          key: "split",
          icon: <ThunderboltOutlined />,
          label: t("切分句子", "Split sentence"),
          onClick: () =>
            sentence.splitStatus === "SPLITTABLE"
              ? void startSentenceSplit(sentence)
              : void startSentenceSplit(sentence, {
                  force: { targetCount: "auto", instruction: "" }
                })
        });
      }
    }

    if (canEdit && rootIndex >= 0) {
      if (activeLanguage === "en") {
        items.push(
          {
            key: "insert-above",
            icon: <PlusOutlined />,
            label: t("上方插入", "Insert above"),
            onClick: () => openCreateSentence(rootIndex)
          },
          {
            key: "insert-below",
            icon: <PlusOutlined />,
            label: t("下方插入", "Insert below"),
            onClick: () => openCreateSentence(rootIndex + 1)
          }
        );
      }
      items.push(
        {
          key: "move-up",
          icon: <ArrowUpOutlined />,
          label: t("上移", "Move up"),
          disabled: rootIndex === 0,
          onClick: () =>
            void mutateSentence(
              "/api/article/moveSentence",
              { id: sentence.id, direction: "up" },
              translate("顺序已更新", "Sentence order updated.")
            )
        },
        {
          key: "move-down",
          icon: <ArrowDownOutlined />,
          label: t("下移", "Move down"),
          disabled: rootIndex === sentenceGroups.length - 1,
          onClick: () =>
            void mutateSentence(
              "/api/article/moveSentence",
              { id: sentence.id, direction: "down" },
              translate("顺序已更新", "Sentence order updated.")
            )
        },
        {
          key: "edit",
          icon: <EditOutlined />,
          label: t("编辑", "Edit"),
          onClick: () => openEditSentence(sentence)
        },
        {
          key: "delete",
          icon: <DeleteOutlined />,
          label: t("删除", "Delete"),
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: t("删除这个句子？", "Delete this sentence?"),
              content: t("删除后无法恢复。", "This cannot be undone."),
              okText: t("删除", "Delete"),
              cancelText: t("取消", "Cancel"),
              okButtonProps: { danger: true },
              onOk: () =>
                mutateSentence("/api/article/deleteSentence", { id: sentence.id }, translate("句子已删除", "Sentence deleted."))
            });
          }
        }
      );
    }

    return items;
  };

  const renderSplitControl = (sentence: SentenceNode, expanded: boolean) => {
    const ui = splitUiBySentence[sentence.id];
    if (ui?.loading || sentence.splitStatus === "SPLITTING") {
      return (
        <span className={styles.sentenceHierarchyControl}>
          <Button type="text" size="small" icon={<ApartmentOutlined />} loading disabled>
            {t("正在生成子句", "Generating parts…")}
          </Button>
        </span>
      );
    }
    if (sentence.children.length > 0 || sentence.splitStatus === "SPLIT") {
      const childCount = sentence.children.length;
      return (
        <span className={styles.sentenceHierarchyControl}>
          <Tooltip title={expanded ? t("收起子句", "Collapse parts") : t("展开子句", "Expand parts")}>
            <Button
              type="text"
              size="small"
              icon={<ApartmentOutlined />}
              onClick={() => void startSentenceSplit(sentence)}
              className={styles.sentenceHierarchyButton}
              aria-label={expanded ? t("收起子句", "Collapse parts") : t("展开子句", "Expand parts")}
            >
              {expanded ? t("收起子句", "Collapse parts") : t(`展开${childCount ? ` ${childCount} 个` : ""}子句`, childCount ? `Show ${childCount} ${childCount === 1 ? "part" : "parts"}` : "Show parts")}
              {expanded ? <UpOutlined /> : <DownOutlined />}
            </Button>
          </Tooltip>
        </span>
      );
    }
    return null;
  };

  const renderSplitProgress = (sentence: SentenceNode) => {
    const sentenceId = sentence.id;
    const state = splitUiBySentence[sentenceId];
    if (!state?.loading && !state?.analysis && !state?.temporaryChildren.length && !state?.error)
      return null;
    return (
      <>
        {state.analysis && <div className={styles.splitAnalysis}>{state.analysis}</div>}
        {!!state.temporaryChildren.length && (
          <div className={styles.temporaryChildren}>
            {state.temporaryChildren.map((child, index) => (
              <div key={`${sentenceId}-temporary-${index}`}>
                <strong>{index + 1}.</strong> {child.originalContent}
                <br />
                <span>{child.translatedContent}</span>
              </div>
            ))}
          </div>
        )}
        {state.error && (
          <div className={styles.splitError} role="alert">
            <span>{t(...state.error.display)}</span>
            <div className={styles.splitErrorActions}>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  setRegeneratingSentence(sentence);
                  setRegenerationFailure(state.error);
                  setRegenerationFeedback("");
                }}
              >
                {t("重新生成", "Regenerate")}
              </Button>
              <Button
                size="small"
                onClick={() =>
                  updateSplitUi(sentenceId, () => ({
                    analysis: "",
                    temporaryChildren: [],
                    loading: false,
                    error: undefined
                  }))
                }
              >
                {t("清空结果", "Clear result")}
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderSentenceItem = (
    row: SentenceDisplayRow,
    displayIndex: number,
    variant: PlaybackSettings["readingMode"]
  ) => {
    const sentence = row.sentence;
    const playableIndex = playableSentences.findIndex((item) => item.id === sentence.id);
    const index = playableIndex >= 0 ? playableIndex : displayIndex;
    const rootIndex = sentence.parentSentenceId
      ? -1
      : sentenceGroups.findIndex((group) => group.sentenceGroupId === sentence.sentenceGroupId);
    const textVisibility = resolveSentenceTextVisibility(
      sentenceVisibilityById[sentence.id],
      {
        showOriginal: playbackSettings.showOriginal,
        showTranslation: playbackSettings.showTranslation
      }
    );

    return (
      <SentenceItem
        key={sentence.id}
        originalContent={sentence.originalContent}
        translatedContent={sentence.translatedContent}
        index={index}
        displayNumber={row.displayNumber}
        duration={(sentence as Sentence).duration || 0}
        id={sentence.id}
        totalPlayCount={sentence.playCount}
        playedWordIndexes={sentence.playedWordIndexes}
        resumePoint={row.playable && activeSentenceIndex === null && resumeIndex === playableIndex}
        times={playbackSettings.repeatCount}
        v={playbackSettings.voices[activeLanguage]}
        rate={playbackSettings.playbackRate}
        delay={playbackSettings.extraPauseSeconds}
        playing={row.playable && activeSentenceIndex === playableIndex}
        hasNext={
          (playableIndex >= 0 && playableIndex < playableSentences.length - 1) ||
          Boolean(continuousPlayback && article?.nextArticleId)
        }
        playbackKey={playbackSession}
        onPlayStart={handleSentencePlayStart}
        onPlayStop={handleSentencePlayStop}
        onPlayEnd={handleSentencePlayEnd}
        onPlaybackCompleted={handleSentencePlaybackCompleted}
        onWordPreviewed={handleSentenceWordPreviewed}
        onPauseChange={setSentencePaused}
        sound={true}
        actions={renderSentenceActions(sentence, rootIndex)}
        depth={row.depth}
        playable={row.playable}
        hierarchyControl={renderSplitControl(sentence, row.expanded)}
        transientContent={renderSplitProgress(sentence)}
        variant={variant}
        showOriginal={textVisibility.showOriginal}
        showTranslation={textVisibility.showTranslation}
        visibilityControlsDisabled={!sentenceVisibilityLoaded}
        onTextVisibilityChange={(visibility) =>
          updateSentenceVisibility(sentence.id, visibility)
        }
        languageTabs={
          <Segmented
            size="small"
            value={activeLanguage}
            options={playbackSettings.learningLanguages.map((languageCode) => {
              const option = LEARNING_LANGUAGE_OPTIONS.find((item) => item.code === languageCode)!;
              return { label: option.nativeLabel, value: languageCode };
            })}
            onChange={(value) => changeActiveLanguage(value as LearningLanguageCode)}
          />
        }
      />
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>{t("正在载入文章…", "Loading article…")}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isFocusMode ? styles.focusContainer : ""}`}>
      <div className={styles.header}>
        <div className={styles.leftControls}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleGoBack}
            aria-label={t("返回", "Back")}
            title={t("返回", "Back")}
            className={styles.backButton}
          >
            {t("返回", "Back")}
          </Button>
          {!isFocusMode ? (
            <>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleContinuePlayback}
                disabled={
                  !progressLoaded
                  || isGeneratingActiveLanguage
                  || missingSentenceGroups.length > 0
                }
                className={styles.playButton}
              >
                {resumeIndex === null ? t("朗读", "Play") : t("继续", "Resume")}
              </Button>
              {canEdit && activeLanguage === "en" ? (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => openCreateSentence(sentenceGroups.length)}
                  aria-label={t("添加句子", "Add sentence")}
                  title={t("添加句子", "Add sentence")}
                  className={styles.addSentenceButton}
                >
                  {t("添加句子", "Add sentence")}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
        <h1 className={styles.title}>
          <span>
            {isFocusMode && focusIndex !== null
              ? `${focusIndex + 1} / ${playableSentences.length}`
              : article?.title}
          </span>
          {article?.isPublic && <Tag color="blue">{t("公共", "Public")}</Tag>}
        </h1>
        <div className={styles.rightControls}>
          <Button
            type="text"
            icon={isFocusMode ? <UnorderedListOutlined /> : <FullscreenOutlined />}
            onClick={() => changeReadingMode(isFocusMode ? "list" : "focus")}
            aria-label={isFocusMode ? t("切换到列表模式", "Switch to list view") : t("切换到专注模式", "Switch to focus view")}
            className={styles.readingModeButton}
          >
            <span className={styles.readingModeLabel}>{isFocusMode ? t("列表", "List") : t("专注", "Focus")}</span>
          </Button>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={handleOpenSettings}
            aria-label={t("阅读设置", "Reading settings")}
            className={styles.settingsButton}
          />
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            aria-label={t("退出登录", "Sign out")}
            className={styles.logoutButton}
          />
        </div>
      </div>

      <div className={styles.content}>
        {!isFocusMode && resumeIndex !== null && activeSentenceIndex === null && (
          <div className={styles.resumeNotice} role="status">
            <span>{t(`上次停在第 ${resumeIndex + 1} 句`, `You left off at sentence ${resumeIndex + 1}.`)}</span>
            <Button type="link" onClick={handleContinuePlayback}>
              {t("从这里继续", "Resume here")}
            </Button>
            {resumeIndex > 0 && (
              <Button type="link" onClick={handlePlayFromBeginning}>
                {t("从头播放", "Play from the start")}
              </Button>
            )}
          </div>
        )}
        {!hasSentenceGroups && (
          <div className={styles.emptySentence}>
            <p>{t("暂无句子", "No sentences yet")}</p>
            {canEdit && activeLanguage === "en" && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateSentence(0)}>
                {t("添加第一句", "Add the first sentence")}
              </Button>
            )}
          </div>
        )}
        {!isFocusMode ? (
          <>
            {languageSections.map((section) => section.rows.length
              ? section.rows.map((row) => renderSentenceItem(
                  row,
                  displayRows.indexOf(row),
                  "list"
                ))
              : (
                <div className={styles.missingLanguageSentence} key={section.sentenceGroupId}>
                  <Segmented
                    size="small"
                    value={activeLanguage}
                    options={playbackSettings.learningLanguages.map((languageCode) => {
                      const option = LEARNING_LANGUAGE_OPTIONS.find((item) => item.code === languageCode)!;
                      return { label: option.nativeLabel, value: languageCode };
                    })}
                    onChange={(value) => changeActiveLanguage(value as LearningLanguageCode)}
                  />
                  <p>
                    {isGeneratingActiveLanguage
                      ? t(`正在生成${learningLanguageName}内容…`, `Generating ${learningLanguageName} text…`)
                      : activeLanguageGenerationError || t(`正在准备${learningLanguageName}内容…`, `Preparing ${learningLanguageName} text…`)}
                  </p>
                  {isGeneratingActiveLanguage ? <Spin size="small" /> : null}
                  {activeLanguageGenerationError ? (
                    <Button
                      type="primary"
                      onClick={() => void generateMissingLanguage(activeLanguage, true)}
                    >
                      {t("重新生成", "Regenerate")}
                    </Button>
                  ) : null}
                </div>
              ))}
          </>
        ) : focusedRow && focusIndex !== null ? (
          <div className={styles.focusViewport}>
            <div className={styles.focusStage}>
              {renderSentenceItem(
                focusedRow,
                displayRows.findIndex((row) => row.sentence.id === focusedRow.sentence.id),
                "focus"
              )}
            </div>
            <nav className={styles.focusNavigation} aria-label={t("专注阅读句子导航", "Focus reading navigation")}>
              <Button
                type="text"
                icon={<LeftOutlined />}
                disabled={focusIndex === 0}
                onClick={() => handleFocusNavigate(-1)}
                className={styles.focusNavigationButton}
              >
                {t("上一句", "Previous")}
              </Button>
              <span className={styles.focusNavigationProgress}>
                {focusIndex + 1} / {playableSentences.length}
              </span>
              <Button
                type="text"
                icon={<RightOutlined />}
                iconPosition="end"
                disabled={focusIndex === playableSentences.length - 1}
                onClick={() => handleFocusNavigate(1)}
                className={styles.focusNavigationButton}
              >
                {t("下一句", "Next")}
              </Button>
            </nav>
          </div>
        ) : missingSentenceGroups.length ? (
          <div className={styles.missingLanguageSentence}>
            <p>
              {isGeneratingActiveLanguage
                ? t(`正在生成${learningLanguageName}内容…`, `Generating ${learningLanguageName} text…`)
                : activeLanguageGenerationError || t(`正在准备${learningLanguageName}内容…`, `Preparing ${learningLanguageName} text…`)}
            </p>
            {isGeneratingActiveLanguage ? <Spin size="small" /> : null}
            {activeLanguageGenerationError ? (
              <Button
                type="primary"
                onClick={() => void generateMissingLanguage(activeLanguage, true)}
              >
                {t("重新生成", "Regenerate")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Modal
        title={t("纠错并重新生成", "Revise and regenerate")}
        open={Boolean(regeneratingSentence)}
        onCancel={() => {
          speechRecognitionRef.current?.stop();
          setRegeneratingSentence(null);
          setRegenerationFailure(undefined);
          setRegenerationFeedback("");
        }}
        onOk={submitRegeneration}
        okText={regenerationFeedback.trim() ? t("按建议重新生成", "Regenerate with feedback") : t("直接重新生成", "Regenerate")}
        cancelText={t("取消", "Cancel")}
      >
        <p>{t("可以直接重新生成，也可以补充修改建议。旧结果和已有校验错误会自动发送给模型。", "Regenerate now or suggest a change. The previous result and its validation errors will be included.")}</p>
        <Input.TextArea
          value={regenerationFeedback}
          onChange={(event) => setRegenerationFeedback(event.target.value)}
          placeholder={t("选填：输入或使用语音说出修改建议", "Optional: type or dictate feedback")}
          rows={4}
          maxLength={1000}
          showCount
        />
        {typeof window !== "undefined" &&
          Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
            <Button
              className={styles.feedbackSpeechButton}
              icon={<AudioOutlined />}
              type={listeningFeedback ? "primary" : "default"}
              onClick={toggleFeedbackSpeech}
            >
              {listeningFeedback ? t("停止语音输入", "Stop dictation") : t("语音输入", "Dictate feedback")}
            </Button>
          )}
      </Modal>

      <Modal
        title={t("阅读设置", "Reading settings")}
        open={isSettingsModalVisible}
        onCancel={handleCloseSettings}
        className={styles.settingsModal + " max-w-[600px]"}
        footer={null}
      >
        <div className={`${styles.settingItem} ${styles.settingSwitchItem}`}>
          <label>{t("界面语言", "Interface language")}</label>
          <LanguageSwitch />
        </div>
        <div className={styles.settingItem}>
          <label>{t("学习语言:", "Learning languages")}</label>
          <Select
            mode="multiple"
            allowClear={false}
            value={playbackSettings.learningLanguages}
            options={LEARNING_LANGUAGE_OPTIONS.map((language) => ({
              label: t(`${language.label} · ${language.nativeLabel}`, language.code === "en" ? "English" : `${englishLanguageNames[language.code]} · ${language.nativeLabel}`),
              value: language.code
            }))}
            onChange={(values: LearningLanguageCode[]) => {
              if (!values.length) return;
              const nextActiveLanguage = values.includes(activeLanguage) ? activeLanguage : values[0];
              const nextSettings = updatePlaybackSettings({
                learningLanguages: values,
                activeLanguage: nextActiveLanguage
              });
              setActiveSentenceIndex(null);
              setContinuousPlayback(false);
              setPlaybackSession((session) => session + 1);
              persistPlaybackSettings(nextSettings);
            }}
            style={{ width: "100%" }}
          />
        </div>
        <div className={`${styles.settingItem} ${styles.settingSwitchItem}`}>
          <label>{t("显示原文", "Show original")}</label>
          <Switch
            checked={playbackSettings.showOriginal}
            checkedChildren={t("显示", "Show")}
            unCheckedChildren={t("隐藏", "Hide")}
            onChange={(checked) => {
              const nextSettings = updatePlaybackSettings({
                showOriginal: checked
              });
              persistPlaybackSettings(nextSettings);
            }}
          />
        </div>
        <div className={`${styles.settingItem} ${styles.settingSwitchItem}`}>
          <label>{t("显示中文翻译", "Show Chinese translation")}</label>
          <Switch
            checked={playbackSettings.showTranslation}
            checkedChildren={t("显示", "Show")}
            unCheckedChildren={t("隐藏", "Hide")}
            onChange={(checked) => {
              const nextSettings = updatePlaybackSettings({
                showTranslation: checked
              });
              persistPlaybackSettings(nextSettings);
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>{t("阅读模式:", "Reading mode")}</label>
          <Segmented
            block
            value={playbackSettings.readingMode}
            options={[
              { label: t("列表", "List"), value: "list" },
              { label: t("专注", "Focus"), value: "focus" }
            ]}
            onChange={(value) => changeReadingMode(value as PlaybackSettings["readingMode"])}
          />
        </div>
        <div className={styles.settingItem}>
          <label>{t("音色:", "Voice")}</label>
          <Select
            value={playbackSettings.voices[activeLanguage]}
            onChange={(value) => {
              const nextSettings = updatePlaybackSettings({
                voices: { ...playbackSettingsRef.current.voices, [activeLanguage]: value }
              });
              persistPlaybackSettings(nextSettings);
            }}
            style={{ width: "100%" }}
            options={getVoiceOptions(activeLanguage)}
          />
        </div>
        <div className={styles.settingItem}>
          <label>{t("说话速度:", "Playback speed")}</label>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={playbackSettings.playbackRate}
            onChange={(value) => updatePlaybackSettings({ playbackRate: value })}
            onChangeComplete={() => persistPlaybackSettings(playbackSettingsRef.current)}
            marks={{
              0.5: t("慢", "Slow"),
              1: t("正常", "Normal"),
              1.5: t("快", "Fast"),
              2: t("非常快", "Very fast")
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>{t("播放次数:", "Repeat count")}</label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={playbackSettings.repeatCount}
            onChange={(value) => updatePlaybackSettings({ repeatCount: value })}
            onChangeComplete={() => persistPlaybackSettings(playbackSettingsRef.current)}
            marks={{
              1: t("1次", "1×"),
              2: t("2次", "2×"),
              3: t("3次", "3×"),
              4: t("4次", "4×"),
              5: t("5次", "5×"),
              10: t("10次", "10×")
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>{t(`额外停顿: ${playbackSettings.extraPauseSeconds}秒`, `Extra pause: ${playbackSettings.extraPauseSeconds} s`)}</label>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={playbackSettings.extraPauseSeconds}
            onChange={(value) => updatePlaybackSettings({ extraPauseSeconds: value })}
            onChangeComplete={() => persistPlaybackSettings(playbackSettingsRef.current)}
            marks={{
              0: t("0秒", "0 s"),
              5: t("5秒", "5 s"),
              10: t("10秒", "10 s")
            }}
          />
        </div>
      </Modal>

      <Modal
        title={editingSentence ? t("编辑句子", "Edit sentence") : t(`添加${learningLanguageName}句子`, `Add a sentence in ${learningLanguageName}`)}
        open={sentenceModalOpen}
        onCancel={closeSentenceModal}
        onOk={handleSaveSentence}
        confirmLoading={savingSentence}
        okText={editingSentence ? t("保存", "Save") : t("添加", "Add")}
        cancelText={t("取消", "Cancel")}
      >
        <Form form={sentenceForm} layout="vertical">
          <Form.Item label={learningLanguageName} name="original">
            <Input.TextArea rows={4} placeholder={t(`输入要朗读的${learningLanguageName}，可不填`, `Enter the ${learningLanguageName} text (optional)`)} />
          </Form.Item>
          <Form.Item label={t("中文释义", "Chinese translation")} name="translation">
            <Input.TextArea rows={4} placeholder={t("输入中文释义，可不填", "Enter the Chinese translation (optional)")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ArticlePage;
