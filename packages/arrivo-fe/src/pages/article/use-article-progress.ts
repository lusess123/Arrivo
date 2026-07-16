import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  clearCachedArticleProgress,
  readCachedArticleProgress,
  resolveResumeSentenceIndex,
  writeCachedArticleProgress
} from "./article-progress";

type UseArticleProgressOptions = {
  articleId?: string;
  userId?: string | number | null;
  sentenceIds: string[];
};

export function useArticleProgress({ articleId, userId, sentenceIds }: UseArticleProgressOptions) {
  const [resumeSentenceId, setResumeSentenceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const syncQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const syncCachedProgress = useCallback(async () => {
    if (!articleId || userId === undefined || userId === null) return true;
    const cached = readCachedArticleProgress(userId, articleId);
    if (!cached?.pending) return true;

    try {
      if (cached.sentenceId) {
        await axios.put(`/api/user/article-progress/${encodeURIComponent(articleId)}`, {
          sentenceId: cached.sentenceId
        });
      } else {
        await axios.delete(`/api/user/article-progress/${encodeURIComponent(articleId)}`);
      }

      const latest = readCachedArticleProgress(userId, articleId);
      if (latest?.pending && latest.sentenceId === cached.sentenceId) {
        if (cached.sentenceId) {
          writeCachedArticleProgress(userId, articleId, cached.sentenceId, false);
        } else {
          clearCachedArticleProgress(userId, articleId);
        }
      }
      return true;
    } catch {
      return false;
    }
  }, [articleId, userId]);

  const enqueueSync = useCallback(() => {
    const task = syncQueueRef.current
      .catch(() => undefined)
      .then(syncCachedProgress);
    syncQueueRef.current = task;
    return task;
  }, [syncCachedProgress]);

  useEffect(() => {
    let active = true;
    setLoaded(false);

    if (!articleId || userId === undefined || userId === null) {
      setResumeSentenceId(null);
      setLoaded(true);
      return;
    }

    const cached = readCachedArticleProgress(userId, articleId);
    setResumeSentenceId(cached?.sentenceId ?? null);

    void (async () => {
      if (cached?.pending) {
        await enqueueSync();
        if (active) setLoaded(true);
        return;
      }

      try {
        const response = await axios.get(`/api/user/article-progress/${encodeURIComponent(articleId)}`);
        if (!active) return;
        const serverSentenceId = typeof response.data?.data?.sentenceId === "string"
          ? response.data.data.sentenceId
          : null;
        setResumeSentenceId(serverSentenceId);
        if (serverSentenceId) {
          writeCachedArticleProgress(userId, articleId, serverSentenceId, false);
        } else {
          clearCachedArticleProgress(userId, articleId);
        }
      } catch {
        // Keep the local sentence so previously loaded articles still resume offline.
      } finally {
        if (active) setLoaded(true);
      }
    })();

    const handleOnline = () => {
      void enqueueSync();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [articleId, enqueueSync, userId]);

  const save = useCallback((sentenceId: string) => {
    if (
      !articleId
      || userId === undefined
      || userId === null
      || !sentenceIds.includes(sentenceId)
    ) {
      return;
    }

    setResumeSentenceId(sentenceId);
    writeCachedArticleProgress(userId, articleId, sentenceId, true);
    void enqueueSync();
  }, [articleId, enqueueSync, sentenceIds, userId]);

  const clear = useCallback(() => {
    if (!articleId || userId === undefined || userId === null) return;
    setResumeSentenceId(null);
    writeCachedArticleProgress(userId, articleId, null, true);
    void enqueueSync();
  }, [articleId, enqueueSync, userId]);

  const resumeIndex = useMemo(
    () => resolveResumeSentenceIndex(sentenceIds, resumeSentenceId),
    [resumeSentenceId, sentenceIds]
  );

  return {
    loaded,
    resumeIndex,
    resumeSentenceId,
    save,
    clear
  };
}
