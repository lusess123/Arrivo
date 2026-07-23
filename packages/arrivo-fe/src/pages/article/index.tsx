import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { history, useLocation, useNavigate, useParams } from "@umijs/max";
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Slider,
  Spin,
  Tag,
  Tooltip,
} from "antd";
import {
  ArrowDownOutlined,
  AudioOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  DownOutlined,
  RightOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import styles from "./index.module.less";
import { asyncHandle } from "@/lib";
import { buildLoginUrl } from "@/lib/auth-redirect";
import axios from "axios";
import ens from "@/data/en.json";
import SentenceItem from "./sentence.item";
import { useApp } from "@/hooks";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  normalizePlaybackSettings,
  readCachedPlaybackSettings,
  resolvePlaybackCompletion,
  writeCachedPlaybackSettings,
  type PlaybackSettings,
} from "./playback";
import { articleSentenceElementId } from "./article-progress";
import { useArticleProgress } from "./use-article-progress";
import { apiUrl } from "@/lib/api";
import {
  buildSentenceTree,
  getPlayableSentences,
  getSentenceDisplayRows,
  type SentenceNode,
} from "./sentence-tree";
import type {
  ArticleSentenceDto,
  SentenceSplitStatus,
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
  error?: { message: string; failedOutput: string; validationError: string };
};

interface ArticleNavigationState {
  autoPlay?: boolean;
}

const ArticlePage: React.FC = () => {
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
  const [sentenceInsertIndex, setSentenceInsertIndex] = useState<number | null>(
    null,
  );
  const [savingSentence, setSavingSentence] = useState(false);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(
    () => ({
      ...DEFAULT_PLAYBACK_SETTINGS,
      voice: ens[0].name,
    }),
  );
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(
    null,
  );
  const [playbackSession, setPlaybackSession] = useState(0);
  const [continuousPlayback, setContinuousPlayback] = useState(false);
  const [expandedSentenceIds, setExpandedSentenceIds] = useState<Set<string>>(
    new Set(),
  );
  const [splitUiBySentence, setSplitUiBySentence] = useState<
    Record<string, SplitUiState>
  >({});
  const [regeneratingSentence, setRegeneratingSentence] =
    useState<SentenceNode | null>(null);
  const [regenerationFeedback, setRegenerationFeedback] = useState("");
  const [regenerationFailure, setRegenerationFailure] =
    useState<SplitUiState["error"]>();
  const [listeningFeedback, setListeningFeedback] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const playbackSettingsRef = useRef(playbackSettings);
  const settingsTouchedRef = useRef(false);
  const settingsSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const restoredArticleRef = useRef<string | null>(null);
  const currentUserId = (auth?.userData as any)?.id;
  const sentenceTree = useMemo(() => buildSentenceTree(sentences), [sentences]);
  const displayRows = useMemo(
    () => getSentenceDisplayRows(sentenceTree, expandedSentenceIds),
    [expandedSentenceIds, sentenceTree],
  );
  const playableSentences = useMemo(
    () => getPlayableSentences(displayRows),
    [displayRows],
  );
  const sentenceIds = useMemo(
    () => playableSentences.map((sentence) => sentence.id),
    [playableSentences],
  );
  const sentenceById = useMemo(
    () => new Map(sentences.map((sentence) => [sentence.id, sentence])),
    [sentences],
  );
  const {
    loaded: progressLoaded,
    resumeIndex: directResumeIndex,
    resumeSentenceId,
    save: saveArticleProgress,
    clear: clearArticleProgress,
  } = useArticleProgress({ articleId: id, userId: currentUserId, sentenceIds });
  const resumeIndex = useMemo(() => {
    if (directResumeIndex !== null || !resumeSentenceId)
      return directResumeIndex;
    let current = sentenceById.get(resumeSentenceId);
    while (current?.parentSentenceId) {
      const parentIndex = sentenceIds.indexOf(current.parentSentenceId);
      if (parentIndex >= 0) return parentIndex;
      current = sentenceById.get(current.parentSentenceId);
    }
    return null;
  }, [directResumeIndex, resumeSentenceId, sentenceById, sentenceIds]);
  const canEdit = useMemo(
    () =>
      Boolean(article && article.userId === currentUserId && !article.isPublic),
    [article, currentUserId],
  );

  const updatePlaybackSettings = useCallback(
    (patch: Partial<PlaybackSettings>) => {
      const nextSettings = normalizePlaybackSettings(
        { ...playbackSettingsRef.current, ...patch },
        ens[0].name,
      );
      settingsTouchedRef.current = true;
      playbackSettingsRef.current = nextSettings;
      setPlaybackSettings(nextSettings);
      return nextSettings;
    },
    [],
  );

  const applyLoadedPlaybackSettings = useCallback(
    (settings: PlaybackSettings) => {
      if (settingsTouchedRef.current) return;
      playbackSettingsRef.current = settings;
      setPlaybackSettings(settings);
    },
    [],
  );

  const persistPlaybackSettings = useCallback(
    (settings: PlaybackSettings) => {
      if (currentUserId === undefined || currentUserId === null) return;

      const userId = currentUserId;
      settingsSaveQueueRef.current = settingsSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const [err] = await asyncHandle(
            axios.put("/api/user/playback-settings", settings),
          );
          if (err) {
            if (err.response?.status !== 401) {
              message.error(err.response?.data?.message || "播放设置保存失败");
            }
            return;
          }

          writeCachedPlaybackSettings(userId, settings);
        });
    },
    [currentUserId],
  );

  const applyArticleData = useCallback((articleData: any) => {
    setArticle(articleData);
    setSentences(
      (articleData?.Sentences || []).map((sentence: any) => ({
        ...sentence,
        originalContent: sentence.originalContent || "",
        translatedContent: sentence.translatedContent || "",
        parentSentenceId: sentence.parentSentenceId || null,
        splitStatus: (sentence.splitStatus || "UNKNOWN") as SentenceSplitStatus,
      })),
    );
    setActiveSentenceIndex(null);
  }, []);

  const fetchArticle = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    const [err, res] = await asyncHandle(
      axios.get(`/api/article/getArticleDetail`, {
        params: {
          id,
        },
      }),
    );

    if (err) {
      if (err.response?.status !== 401) {
        message.error(err.response?.data?.message || err.message);
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
      message.error(err.message);
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
    void fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    if (!id || currentUserId === undefined || currentUserId === null) return;
    const controller = new AbortController();
    void fetch(
      apiUrl(`/api/user/articles/${encodeURIComponent(id)}/sentence-expansion`),
      {
        credentials: "include",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Expansion state failed: ${response.status}`);
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

  useLayoutEffect(() => {
    if (
      !id ||
      loading ||
      !progressLoaded ||
      restoredArticleRef.current === id
    ) {
      return;
    }

    if (resumeIndex === null) return;
    const sentence = playableSentences[resumeIndex];
    if (!sentence) return;
    restoredArticleRef.current = id;

    document
      .getElementById(articleSentenceElementId(sentence.id))
      ?.scrollIntoView({
        behavior: "auto",
        block: "center",
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
    const cachedSettings = readCachedPlaybackSettings(
      currentUserId,
      ens[0].name,
    );
    if (cachedSettings) {
      applyLoadedPlaybackSettings(cachedSettings);
    }

    const controller = new AbortController();
    void (async () => {
      const [err, res] = await asyncHandle(
        axios.get("/api/user/playback-settings", {
          signal: controller.signal,
        }),
      );
      if (controller.signal.aborted) return;

      if (err) {
        if (!cachedSettings && err.response?.status !== 401) {
          message.warning("播放设置暂时无法同步，已使用默认设置");
        }
        return;
      }

      if (settingsTouchedRef.current) return;
      const serverSettings = normalizePlaybackSettings(
        res?.data?.data,
        ens[0].name,
      );
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

  const handleSentencePlayStart = useCallback((index: number) => {
    setContinuousPlayback(false);
    setActiveSentenceIndex(index);
  }, []);

  const handleSentencePlayStop = useCallback((index: number) => {
    setContinuousPlayback(false);
    setActiveSentenceIndex((currentIndex) =>
      currentIndex === index ? null : currentIndex,
    );
  }, []);

  const handleSentencePlayEnd = useCallback(
    (index: number) => {
      if (activeSentenceIndex !== index) return;

      const completion = resolvePlaybackCompletion({
        sentenceIndex: index,
        sentenceCount: playableSentences.length,
        nextArticleId: article?.nextArticleId,
        continuous: continuousPlayback,
      });

      if (completion.type === "next-sentence") {
        setActiveSentenceIndex(completion.sentenceIndex);
        return;
      }

      setActiveSentenceIndex(null);
      setContinuousPlayback(false);

      if (completion.type === "next-article") {
        clearArticleProgress();
        router(`/article/${encodeURIComponent(completion.articleId)}`, {
          state: { autoPlay: true } satisfies ArticleNavigationState,
        });
        return;
      }

      if (completion.type === "all-complete") {
        clearArticleProgress();
        message.success("已播放完全部文章");
      }
    },
    [
      activeSentenceIndex,
      article?.nextArticleId,
      clearArticleProgress,
      continuousPlayback,
      playableSentences.length,
      router,
    ],
  );

  const startContinuousPlayback = useCallback(
    (sentenceIndex: number) => {
      if (!playableSentences.length) {
        message.info("暂无可朗读内容");
        return;
      }

      setPlaybackSession((session) => session + 1);
      setContinuousPlayback(true);
      setActiveSentenceIndex(sentenceIndex);
    },
    [playableSentences.length],
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

    router(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    });

    if (!playableSentences.length) {
      message.info("下一篇暂无可朗读内容");
      return;
    }

    setPlaybackSession((session) => session + 1);
    setContinuousPlayback(true);
    setActiveSentenceIndex(resumeIndex ?? 0);
  }, [
    article,
    id,
    loading,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    playableSentences.length,
    progressLoaded,
    resumeIndex,
    router,
  ]);

  const persistExpansion = useCallback(
    async (sentenceId: string, expanded: boolean) => {
      if (!id) return;
      const [err] = await asyncHandle(
        axios.patch(
          `/api/user/articles/${encodeURIComponent(id)}/sentence-expansion`,
          { sentenceId, expanded },
        ),
      );
      if (err) message.warning("展开状态暂未同步");
    },
    [id],
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
    [persistExpansion],
  );

  const updateSplitUi = useCallback(
    (sentenceId: string, update: (state: SplitUiState) => SplitUiState) => {
      setSplitUiBySentence((current) => ({
        ...current,
        [sentenceId]: update(
          current[sentenceId] || {
            analysis: "",
            temporaryChildren: [],
            loading: false,
          },
        ),
      }));
    },
    [],
  );

  const handleSplitEvent = useCallback(
    (sentenceId: string, eventName: string, payload: any) => {
      if (eventName === "started") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          loading: true,
          error: undefined,
        }));
        return;
      }
      if (eventName === "retrying") {
        updateSplitUi(sentenceId, () => ({
          analysis: "",
          temporaryChildren: [],
          loading: true,
        }));
        message.info(payload.message || "结果不合格，正在自动重新生成");
        return;
      }
      if (eventName === "analysis_delta") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          analysis: state.analysis + (payload.text || ""),
        }));
        return;
      }
      if (eventName === "child_started") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          temporaryChildren: state.temporaryChildren[payload.index]
            ? state.temporaryChildren
            : [
                ...state.temporaryChildren,
                { originalContent: "", translatedContent: "" },
              ],
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
            translatedContent: "",
          };
          temporaryChildren[payload.index] = {
            ...child,
            [eventName === "original_delta"
              ? "originalContent"
              : "translatedContent"]:
              child[
                eventName === "original_delta"
                  ? "originalContent"
                  : "translatedContent"
              ] + (payload.text || ""),
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
          const descendants = new Set<string>();
          let changed = true;
          while (changed) {
            changed = false;
            for (const item of current) {
              if (
                item.parentSentenceId === sentenceId ||
                (item.parentSentenceId &&
                  descendants.has(item.parentSentenceId))
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
                : item,
            );
          const children: Sentence[] = (payload.children || []).map(
            (child: any) => ({
              id: child.id,
              originalContent: child.originalContent || "",
              translatedContent: child.translatedContent || "",
              parentSentenceId: sentenceId,
              sortOrder: child.sortOrder,
              splitStatus: (child.splittable
                ? "SPLITTABLE"
                : "UNSPLITTABLE") as SentenceSplitStatus,
            }),
          );
          return [...retained, ...children];
        });
        setExpandedSentenceIds((current) => new Set(current).add(sentenceId));
        void persistExpansion(sentenceId, true);
        updateSplitUi(sentenceId, () => ({
          analysis: "",
          temporaryChildren: [],
          loading: false,
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
                (item.parentSentenceId &&
                  descendants.has(item.parentSentenceId))
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
                    splitStatus: "UNSPLITTABLE" as SentenceSplitStatus,
                  }
                : item,
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
          loading: false,
        }));
        message.info("这个句子已经不适合继续切分");
        return;
      }
      if (eventName === "failed") {
        updateSplitUi(sentenceId, (state) => ({
          ...state,
          loading: false,
          error: {
            message: payload.message || "句子切分失败",
            failedOutput: payload.failedOutput || "",
            validationError:
              payload.validationError || payload.message || "句子切分失败",
          },
        }));
      }
    },
    [persistExpansion, updateSplitUi],
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
      },
    ) => {
      if (!id) return;
      if (
        !options &&
        (sentence.children.length > 0 || sentence.splitStatus === "SPLIT")
      ) {
        setSentenceExpanded(sentence.id, !expandedSentenceIds.has(sentence.id));
        return;
      }

      updateSplitUi(sentence.id, () => ({
        analysis: "",
        temporaryChildren: [],
        loading: true,
        error: undefined,
      }));
      try {
        const action = options?.feedback
          ? "regenerate-stream"
          : options?.force
            ? "force-split-stream"
            : "split-stream";
        const response = await fetch(
          apiUrl(
            `/api/articles/${encodeURIComponent(id)}/sentences/${encodeURIComponent(sentence.id)}/${action}`,
          ),
          {
            method: "POST",
            credentials: "include",
            ...(options
              ? {
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(
                    options.feedback
                      ? { feedback: options.feedback }
                      : options.force,
                  ),
                }
              : {}),
          },
        );
        if (!response.ok || !response.body)
          throw new Error(`句子切分请求失败 (${response.status})`);
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
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
            if (eventName && data)
              handleSplitEvent(sentence.id, eventName, JSON.parse(data));
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "句子切分失败";
        updateSplitUi(sentence.id, (state) => ({
          ...state,
          loading: false,
          error: {
            message: errorMessage,
            failedOutput: JSON.stringify(state.temporaryChildren),
            validationError: errorMessage,
          },
        }));
      }
    },
    [
      expandedSentenceIds,
      handleSplitEvent,
      id,
      setSentenceExpanded,
      updateSplitUi,
    ],
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
          validationError: failure.validationError,
        },
      });
    } else {
      void startSentenceSplit(sentence, { feedback });
    }
  }, [
    regeneratingSentence,
    regenerationFailure,
    regenerationFeedback,
    startSentenceSplit,
  ]);

  const toggleFeedbackSpeech = useCallback(() => {
    if (listeningFeedback) {
      speechRecognitionRef.current?.stop();
      return;
    }
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
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
  }, [listeningFeedback]);

  const openCreateSentence = (insertIndex: number) => {
    if (!canEdit) return;
    setEditingSentence(null);
    setSentenceInsertIndex(insertIndex);
    sentenceForm.setFieldsValue({
      original: "",
      translation: "",
    });
    setSentenceModalOpen(true);
  };

  const openEditSentence = (sentence: Sentence) => {
    if (!canEdit) return;
    setEditingSentence(sentence);
    setSentenceInsertIndex(null);
    sentenceForm.setFieldsValue({
      original: sentence.originalContent,
      translation: sentence.translatedContent,
    });
    setSentenceModalOpen(true);
  };

  const closeSentenceModal = () => {
    setSentenceModalOpen(false);
    setEditingSentence(null);
    setSentenceInsertIndex(null);
    sentenceForm.resetFields();
  };

  const handleSaveSentence = async () => {
    if (!id) return;

    const values = await sentenceForm.validateFields();
    const original = values.original?.trim() || "";
    const translation = values.translation?.trim() || "";
    if (!original && !translation) {
      message.info("请至少填写英文或中文释义");
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
            translation,
          }
        : {
            articleId: id,
            original,
            translation,
            insertIndex: sentenceInsertIndex ?? sentenceTree.length,
          };
      const [err, res] = await asyncHandle(axios.post(endpoint, payload));

      if (err) {
        message.error(err.response?.data?.message || err.message);
        return;
      }

      applyArticleData(res?.data?.data);
      closeSentenceModal();
      message.success(editingSentence ? "句子已更新" : "句子已添加");
    } finally {
      setSavingSentence(false);
    }
  };

  const mutateSentence = async (
    endpoint: string,
    payload: Record<string, any>,
    successText: string,
  ) => {
    const [err, res] = await asyncHandle(axios.post(endpoint, payload));

    if (err) {
      message.error(err.response?.data?.message || err.message);
      return;
    }

    applyArticleData(res?.data?.data);
    message.success(successText);
  };

  const renderSentenceActions = (sentence: Sentence, index: number) => {
    if (!canEdit || sentence.parentSentenceId) return null;

    return (
      <div className={styles.sentenceActions}>
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => openCreateSentence(index)}
        >
          上方插入
        </Button>
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => openCreateSentence(index + 1)}
        >
          下方插入
        </Button>
        <Button
          size="small"
          icon={<ArrowUpOutlined />}
          disabled={index === 0}
          onClick={() =>
            mutateSentence(
              "/api/article/moveSentence",
              { id: sentence.id, direction: "up" },
              "顺序已更新",
            )
          }
        />
        <Button
          size="small"
          icon={<ArrowDownOutlined />}
          disabled={index === sentenceTree.length - 1}
          onClick={() =>
            mutateSentence(
              "/api/article/moveSentence",
              { id: sentence.id, direction: "down" },
              "顺序已更新",
            )
          }
        />
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEditSentence(sentence)}
        >
          编辑
        </Button>
        <Popconfirm
          title="删除这个句子？"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() =>
            mutateSentence(
              "/api/article/deleteSentence",
              { id: sentence.id },
              "句子已删除",
            )
          }
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>
    );
  };

  const renderSplitControl = (sentence: SentenceNode, expanded: boolean) => {
    const ui = splitUiBySentence[sentence.id];
    if (ui?.loading || sentence.splitStatus === "SPLITTING") {
      return (
        <span className={styles.splitControls}>
          <Button size="small" loading disabled>
            正在生成
          </Button>
        </span>
      );
    }
    if (sentence.children.length > 0 || sentence.splitStatus === "SPLIT") {
      return (
        <span>
          <Tooltip title={expanded ? "收起子句" : "展开子句"}>
            <Button
              type="text"
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              onClick={() => void startSentenceSplit(sentence)}
              aria-label={expanded ? "收起子句" : "展开子句"}
            />
          </Tooltip>
          <Tooltip title="提供错误判断并重新生成">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => {
                setRegeneratingSentence(sentence);
                setRegenerationFailure(undefined);
                setRegenerationFeedback("");
              }}
              aria-label="重新生成切分"
            />
          </Tooltip>
        </span>
      );
    }
    return (
      <span className={styles.splitControls}>
        <Tooltip title="优先忠实切分，必要时自动调整表达并保留原意">
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() =>
              sentence.splitStatus === "SPLITTABLE"
                ? void startSentenceSplit(sentence)
                : void startSentenceSplit(sentence, {
                    force: { targetCount: "auto", instruction: "" },
                  })
            }
          >
            切分句子
          </Button>
        </Tooltip>
      </span>
    );
  };

  const renderSplitProgress = (sentence: SentenceNode) => {
    const sentenceId = sentence.id;
    const state = splitUiBySentence[sentenceId];
    if (
      !state?.loading &&
      !state?.analysis &&
      !state?.temporaryChildren.length &&
      !state?.error
    )
      return null;
    return (
      <>
        {state.analysis && (
          <div className={styles.splitAnalysis}>{state.analysis}</div>
        )}
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
            <span>{state.error.message}</span>
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
                重新生成
              </Button>
              <Button
                size="small"
                onClick={() =>
                  updateSplitUi(sentenceId, () => ({
                    analysis: "",
                    temporaryChildren: [],
                    loading: false,
                    error: undefined,
                  }))
                }
              >
                清空结果
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>Loading article...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.leftControls}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleGoBack}
            className={styles.backButton}
          >
            返回
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleContinuePlayback}
            disabled={!progressLoaded}
            className={styles.playButton}
          >
            {resumeIndex === null ? "朗读" : "继续"}
          </Button>
          {canEdit && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => openCreateSentence(sentenceTree.length)}
              className={styles.addSentenceButton}
            >
              添加句子
            </Button>
          )}
        </div>
        <h1 className={styles.title}>
          <span>{article?.title}</span>
          {article?.isPublic && <Tag color="blue">公共</Tag>}
        </h1>
        <div className={styles.rightControls}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={handleOpenSettings}
            className={styles.settingsButton}
          />
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className={styles.logoutButton}
          />
        </div>
      </div>

      <div className={styles.content}>
        {resumeIndex !== null && activeSentenceIndex === null && (
          <div className={styles.resumeNotice} role="status">
            <span>上次停在第 {resumeIndex + 1} 句</span>
            <Button type="link" onClick={handleContinuePlayback}>
              从这里继续
            </Button>
            {resumeIndex > 0 && (
              <Button type="link" onClick={handlePlayFromBeginning}>
                从头播放
              </Button>
            )}
          </div>
        )}
        {sentenceTree.length === 0 && (
          <div className={styles.emptySentence}>
            <p>暂无句子</p>
            {canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreateSentence(0)}
              >
                添加第一句
              </Button>
            )}
          </div>
        )}
        {displayRows.map((row, displayIndex) => {
          const sentence = row.sentence;
          const playableIndex = playableSentences.findIndex(
            (item) => item.id === sentence.id,
          );
          const index = playableIndex >= 0 ? playableIndex : displayIndex;
          const rootIndex = sentence.parentSentenceId
            ? -1
            : sentenceTree.findIndex((item) => item.id === sentence.id);
          return (
            <SentenceItem
              key={sentence.id}
              originalContent={sentence.originalContent}
              translatedContent={sentence.translatedContent}
              index={index}
              duration={(sentence as Sentence).duration || 0}
              id={sentence.id}
              resumePoint={
                row.playable &&
                activeSentenceIndex === null &&
                resumeIndex === playableIndex
              }
              times={playbackSettings.repeatCount}
              v={playbackSettings.voice}
              rate={playbackSettings.playbackRate}
              delay={playbackSettings.extraPauseSeconds}
              playing={row.playable && activeSentenceIndex === playableIndex}
              hasNext={
                (playableIndex >= 0 &&
                  playableIndex < playableSentences.length - 1) ||
                Boolean(continuousPlayback && article?.nextArticleId)
              }
              playbackKey={playbackSession}
              onPlayStart={handleSentencePlayStart}
              onPlayStop={handleSentencePlayStop}
              onPlayEnd={handleSentencePlayEnd}
              sound={true}
              actions={
                rootIndex >= 0
                  ? renderSentenceActions(sentence, rootIndex)
                  : null
              }
              depth={row.depth}
              playable={row.playable}
              auxiliaryControl={renderSplitControl(sentence, row.expanded)}
              transientContent={renderSplitProgress(sentence)}
            />
          );
        })}
      </div>

      <Modal
        title="纠错并重新生成"
        open={Boolean(regeneratingSentence)}
        onCancel={() => {
          speechRecognitionRef.current?.stop();
          setRegeneratingSentence(null);
          setRegenerationFailure(undefined);
          setRegenerationFeedback("");
        }}
        onOk={submitRegeneration}
        okText={regenerationFeedback.trim() ? "按建议重新生成" : "直接重新生成"}
        cancelText="取消"
      >
        <p>
          可以直接重新生成，也可以补充修改建议。旧结果和已有校验错误会自动发送给模型。
        </p>
        <Input.TextArea
          value={regenerationFeedback}
          onChange={(event) => setRegenerationFeedback(event.target.value)}
          placeholder="选填：输入或使用语音说出修改建议"
          rows={4}
          maxLength={1000}
          showCount
        />
        {typeof window !== "undefined" &&
          Boolean(
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition,
          ) && (
            <Button
              className={styles.feedbackSpeechButton}
              icon={<AudioOutlined />}
              type={listeningFeedback ? "primary" : "default"}
              onClick={toggleFeedbackSpeech}
            >
              {listeningFeedback ? "停止语音输入" : "语音输入"}
            </Button>
          )}
      </Modal>

      <Modal
        title="设置"
        open={isSettingsModalVisible}
        onCancel={handleCloseSettings}
        className={styles.settingsModal + " max-w-[600px]"}
        footer={null}
      >
        <div className={styles.settingItem}>
          <label>音色:</label>
          <Select
            value={playbackSettings.voice}
            onChange={(value) => {
              const nextSettings = updatePlaybackSettings({ voice: value });
              persistPlaybackSettings(nextSettings);
            }}
            style={{ width: "100%" }}
            options={ens.map((item) => ({
              label: item["中文"],
              value: item.name,
            }))}
          />
        </div>
        <div className={styles.settingItem}>
          <label>说话速度:</label>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={playbackSettings.playbackRate}
            onChange={(value) =>
              updatePlaybackSettings({ playbackRate: value })
            }
            onChangeComplete={() =>
              persistPlaybackSettings(playbackSettingsRef.current)
            }
            marks={{
              0.5: "慢",
              1: "正常",
              1.5: "快",
              2: "非常快",
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>播放次数:</label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={playbackSettings.repeatCount}
            onChange={(value) => updatePlaybackSettings({ repeatCount: value })}
            onChangeComplete={() =>
              persistPlaybackSettings(playbackSettingsRef.current)
            }
            marks={{
              1: "1次",
              2: "2次",
              3: "3次",
              4: "4次",
              5: "5次",
              10: "10次",
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>额外停顿: {playbackSettings.extraPauseSeconds}秒</label>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={playbackSettings.extraPauseSeconds}
            onChange={(value) =>
              updatePlaybackSettings({ extraPauseSeconds: value })
            }
            onChangeComplete={() =>
              persistPlaybackSettings(playbackSettingsRef.current)
            }
            marks={{
              0: "0秒",
              5: "5秒",
              10: "10秒",
            }}
          />
        </div>
      </Modal>

      <Modal
        title={editingSentence ? "编辑句子" : "添加句子"}
        open={sentenceModalOpen}
        onCancel={closeSentenceModal}
        onOk={handleSaveSentence}
        confirmLoading={savingSentence}
        okText={editingSentence ? "保存" : "添加"}
        cancelText="取消"
      >
        <Form form={sentenceForm} layout="vertical">
          <Form.Item label="英文" name="original">
            <Input.TextArea rows={4} placeholder="输入要朗读的英文，可不填" />
          </Form.Item>
          <Form.Item label="中文释义" name="translation">
            <Input.TextArea rows={4} placeholder="输入中文释义，可不填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ArticlePage;
