type FocusSentence = { id: string };
export type FocusTextLayout = 'single' | 'stack' | 'columns';
export type FocusTextRegionMetrics = {
  availableWidth: number;
  availableHeight: number;
  contentWidth: number;
  contentHeight: number;
};

export function resolveFocusIndex({
  activeIndex,
  selectedSentenceId,
  resumeIndex,
  sentences
}: {
  activeIndex: number | null;
  selectedSentenceId: string | null;
  resumeIndex: number | null;
  sentences: FocusSentence[];
}) {
  if (activeIndex !== null && sentences[activeIndex]) return activeIndex;

  if (selectedSentenceId) {
    const selectedIndex = sentences.findIndex((sentence) => sentence.id === selectedSentenceId);
    if (selectedIndex >= 0) return selectedIndex;
  }

  if (resumeIndex !== null && sentences[resumeIndex]) return resumeIndex;
  return sentences.length ? 0 : null;
}

export function getAdjacentFocusIndex(currentIndex: number, direction: -1 | 1, sentenceCount: number) {
  const nextIndex = currentIndex + direction;
  return nextIndex >= 0 && nextIndex < sentenceCount ? nextIndex : null;
}

export function getFocusTextLayout(
  width: number,
  height: number,
  showOriginal: boolean,
  showTranslation: boolean
): FocusTextLayout {
  if (!showOriginal || !showTranslation) return 'single';
  return width >= 800 && width / Math.max(1, height) >= 1.2 ? 'columns' : 'stack';
}

export function getFocusFontSizeRange(width: number, height: number) {
  const min = 1;
  const responsiveMax = Math.min(Math.max(30, width * 0.05), height * 0.18, 64);
  return {
    min,
    max: Math.max(min, Math.round(responsiveMax))
  };
}

export function doFocusTextRegionsFit(regions: FocusTextRegionMetrics[]) {
  return regions.every(
    ({ availableWidth, availableHeight, contentWidth, contentHeight }) =>
      contentWidth <= availableWidth && contentHeight <= availableHeight
  );
}

export function findLargestFittingFontSize({
  min,
  max,
  fits
}: {
  min: number;
  max: number;
  fits: (size: number) => boolean;
}) {
  let lower = Math.floor(min);
  let upper = Math.floor(max);
  let result: number | null = null;

  while (lower <= upper) {
    const candidate = Math.floor((lower + upper) / 2);
    if (fits(candidate)) {
      result = candidate;
      lower = candidate + 1;
    } else {
      upper = candidate - 1;
    }
  }

  return result;
}
