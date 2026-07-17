export function sortPublicArticles<T extends { playCount?: number; createdAt: string | Date; id: string }>(articles: T[]) {
  return [...articles].sort((left, right) =>
    (right.playCount || 0) - (left.playCount || 0)
    || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    || right.id.localeCompare(left.id)
  );
}
