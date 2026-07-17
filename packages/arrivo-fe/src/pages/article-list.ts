export function sortPublicArticles<T extends { playCount?: number; createdAt: string | Date; id: string }>(articles: T[]) {
  return [...articles].sort((left, right) =>
    (right.playCount || 0) - (left.playCount || 0)
    || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    || right.id.localeCompare(left.id)
  );
}

export type ArticleTab = "mine" | "public";

export function resolveArticleTab(searchParams: URLSearchParams): ArticleTab {
  return searchParams.get("tab") === "public" ? "public" : "mine";
}

export function withArticleTab(searchParams: URLSearchParams, tab: ArticleTab) {
  const next = new URLSearchParams(searchParams);
  next.set("tab", tab);
  return next;
}
