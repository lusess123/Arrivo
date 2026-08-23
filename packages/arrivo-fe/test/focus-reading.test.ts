import { describe, expect, test } from 'bun:test';
import {
  doFocusTextRegionsFit,
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

  test('uses two regions only when both texts are visible', () => {
    expect(getFocusTextLayout(1200, 700, true, true)).toBe('columns');
    expect(getFocusTextLayout(700, 1000, true, true)).toBe('stack');
    expect(getFocusTextLayout(1200, 700, true, false)).toBe('single');
    expect(getFocusTextLayout(1200, 700, false, true)).toBe('single');
    expect(getFocusTextLayout(1200, 700, false, false)).toBe('single');
  });

  test('uses a comfortable responsive font range instead of the viewport edge', () => {
    expect(getFocusFontSizeRange(390, 844)).toEqual({
      min: 1,
      max: 30
    });
    expect(getFocusFontSizeRange(844, 390)).toEqual({
      min: 1,
      max: 42
    });
    expect(getFocusFontSizeRange(1440, 900)).toEqual({
      min: 1,
      max: 64
    });
  });

  test('requires every visible language region to contain its full text', () => {
    expect(
      doFocusTextRegionsFit([
        {
          availableWidth: 320,
          availableHeight: 180,
          contentWidth: 320,
          contentHeight: 160
        },
        {
          availableWidth: 320,
          availableHeight: 100,
          contentWidth: 320,
          contentHeight: 124
        }
      ])
    ).toBe(false);
    expect(
      doFocusTextRegionsFit([
        {
          availableWidth: 320,
          availableHeight: 180,
          contentWidth: 320,
          contentHeight: 160
        }
      ])
    ).toBe(true);
    expect(
      doFocusTextRegionsFit([
        {
          availableWidth: 320,
          availableHeight: 180,
          contentWidth: 348,
          contentHeight: 160
        }
      ])
    ).toBe(false);
  });

  test('keeps the range valid even on an unusually short viewport', () => {
    expect(getFocusFontSizeRange(320, 12)).toEqual({
      min: 1,
      max: 2
    });
  });

  test('constrains each language to a wrapping region without hiding overflow behind scrolling', async () => {
    const styles = await Bun.file(
      new URL('../src/pages/article/index.module.less', import.meta.url)
    ).text();

    expect(styles).toContain('.focusSentenceItem .sentenceTextRegion');
    expect(styles).toContain('overflow: hidden;');
    expect(styles).toContain('overflow-wrap: anywhere;');
    expect(styles).toContain('[data-text-overflow="true"] .sentenceTextRegion');
  });

  test('stretches the focused sentence content across the available reading stage', async () => {
    const styles = await Bun.file(
      new URL('../src/pages/article/index.module.less', import.meta.url)
    ).text();

    expect(styles).toMatch(
      /\.focusSentenceItem\s*\{[^}]*align-items:\s*stretch;/s
    );
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
        min: 1,
        max: 2160,
        fits: () => false
      })
    ).toBeNull();
    expect(
      findLargestFittingFontSize({
        min: 1,
        max: 64,
        fits: (size) => size <= 7
      })
    ).toBe(7);
  });
});
