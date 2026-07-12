import type { TtsWordBoundaryDto } from '@arrivo/contracts';

export type WordTextSegment = {
  text: string;
  wordIndex?: number;
};

export function buildWordTextSegments(
  text: string,
  words: TtsWordBoundaryDto[],
): WordTextSegment[] {
  if (!text || !words.length) return [{ text }];

  const segments: WordTextSegment[] = [];
  const normalizedText = text.toLocaleLowerCase();
  let cursor = 0;

  words.forEach((word, wordIndex) => {
    const normalizedWord = word.text.toLocaleLowerCase();
    if (!normalizedWord) return;
    const start = normalizedText.indexOf(normalizedWord, cursor);
    if (start === -1) return;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    const end = start + word.text.length;
    segments.push({ text: text.slice(start, end), wordIndex });
    cursor = end;
  });

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.some(segment => segment.wordIndex !== undefined) ? segments : [{ text }];
}

export function findActiveWordIndex(words: TtsWordBoundaryDto[], currentTimeMs: number) {
  if (!words.length || currentTimeMs < words[0].offsetMs) return -1;

  let low = 0;
  let high = words.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (words[middle].offsetMs <= currentTimeMs) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  const word = words[low];
  const visibleUntil = words[low + 1]?.offsetMs
    ?? word.offsetMs + Math.max(80, word.durationMs);
  return currentTimeMs < visibleUntil ? low : -1;
}
