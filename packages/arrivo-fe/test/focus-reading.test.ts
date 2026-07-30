import { describe, expect, test } from 'bun:test';
import {
  findLargestFittingFontSize,
  getAdjacentFocusIndex,
  getFocusFontSizeRange,
  getFocusTextLayout,
  resolveFocusIndex
} from '../src/pages/article/focus-reading';

const sentences = [{ id: 'sentence-1' }, { id: 'sentence-1-1' }, { id: 'sentence-2' }];

describe('focus reading navigation', () => {
  test('follows active playback before the selected or resumed sentence', () => {
    expect(
      resolveFocusIndex({
        activeIndex: 1,
        selectedSentenceId: 'sentence-2',
        resumeIndex: 0,
        sentences
      })
    ).toBe(1);
  });

  test('restores the selected sentence, then progress, then the first sentence', () => {
    expect(
      resolveFocusIndex({
        activeIndex: null,
        selectedSentenceId: 'sentence-2',
        resumeIndex: 0,
        sentences
      })
    ).toBe(2);
    expect(
      resolveFocusIndex({
        activeIndex: null,
        selectedSentenceId: null,
        resumeIndex: 1,
        sentences
      })
    ).toBe(1);
    expect(
      resolveFocusIndex({
        activeIndex: null,
        selectedSentenceId: null,
        resumeIndex: null,
        sentences
      })
    ).toBe(0);
    expect(
      resolveFocusIndex({
        activeIndex: null,
        selectedSentenceId: null,
        resumeIndex: null,
        sentences: []
      })
    ).toBeNull();
  });

  test('does not navigate beyond the first or last playable sentence', () => {
    expect(getAdjacentFocusIndex(0, -1, 3)).toBeNull();
    expect(getAdjacentFocusIndex(0, 1, 3)).toBe(1);
    expect(getAdjacentFocusIndex(2, 1, 3)).toBeNull();
    expect(getAdjacentFocusIndex(2, -1, 3)).toBe(1);
  });

  test('uses columns only when translated text has enough horizontal space', () => {
    expect(getFocusTextLayout(1200, 700, true)).toBe('columns');
    expect(getFocusTextLayout(700, 1000, true)).toBe('stack');
    expect(getFocusTextLayout(1200, 700, false)).toBe('single');
  });

  test('lets large screens use their full text area without a fixed font cap', () => {
    expect(getFocusFontSizeRange(3840, 2160)).toEqual({
      min: 16,
      max: 2160
    });
    expect(getFocusFontSizeRange(320, 12)).toEqual({
      min: 16,
      max: 16
    });
  });

  test('chooses the largest whole-pixel font size that fits', () => {
    expect(
      findLargestFittingFontSize({
        min: 24,
        max: 96,
        fits: (size) => size <= 67
      })
    ).toBe(67);
    expect(
      findLargestFittingFontSize({
        min: 16,
        max: 2160,
        fits: (size) => size <= 384
      })
    ).toBe(384);
    expect(
      findLargestFittingFontSize({
        min: 16,
        max: 2160,
        fits: () => false
      })
    ).toBe(16);
  });
});
