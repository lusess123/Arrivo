export type CachedArticleProgress = {
  sentenceId: string | null;
  pending: boolean;
};

type ArticleProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function articleProgressStorageKey(userId: string | number, articleId: string) {
  return `arrivo:article-progress:${encodeURIComponent(String(userId))}:${encodeURIComponent(articleId)}`;
}

export function articleSentenceElementId(sentenceId: string) {
  return `article-sentence-${sentenceId}`;
}

export function readCachedArticleProgress(
  userId: string | number,
  articleId: string,
  storage: ArticleProgressStorage | null = typeof window === "undefined" ? null : window.localStorage
): CachedArticleProgress | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(articleProgressStorageKey(userId, articleId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CachedArticleProgress>;
    if (value.sentenceId !== null && (typeof value.sentenceId !== "string" || !value.sentenceId)) return null;
    if (value.sentenceId === null && value.pending !== true) return null;
    return { sentenceId: value.sentenceId, pending: value.pending === true };
  } catch {
    return null;
  }
}

export function writeCachedArticleProgress(
  userId: string | number,
  articleId: string,
  sentenceId: string | null,
  pending: boolean,
  storage: ArticleProgressStorage | null = typeof window === "undefined" ? null : window.localStorage
) {
  if (!storage) return;

  try {
    storage.setItem(
      articleProgressStorageKey(userId, articleId),
      JSON.stringify({ sentenceId, pending })
    );
  } catch {
    // Offline playback should continue even if storage is unavailable.
  }
}

export function clearCachedArticleProgress(
  userId: string | number,
  articleId: string,
  storage: ArticleProgressStorage | null = typeof window === "undefined" ? null : window.localStorage
) {
  if (!storage) return;

  try {
    storage.removeItem(articleProgressStorageKey(userId, articleId));
  } catch {
    // Storage cleanup is best effort.
  }
}

export function resolveResumeSentenceIndex(
  sentenceIds: string[],
  savedSentenceId: string | null | undefined
) {
  if (!savedSentenceId || !sentenceIds.length) return null;
  const savedIndex = sentenceIds.indexOf(savedSentenceId);
  return savedIndex >= 0 ? savedIndex : 0;
}
