import { describe, expect, test } from 'bun:test';
import { resolveSentenceTextVisibility } from '../src/pages/article/sentence-visibility';

describe('per-sentence text visibility', () => {
  test('uses a saved sentence preference before the global defaults', () => {
    expect(
      resolveSentenceTextVisibility(
        { showOriginal: false, showTranslation: true },
        { showOriginal: true, showTranslation: false }
      )
    ).toEqual({ showOriginal: false, showTranslation: true });
  });

  test('provides independent original and translation controls', async () => {
    const source = await Bun.file(
      new URL('../src/pages/article/sentence.item.tsx', import.meta.url)
    ).text();

    expect(source).toContain('showOriginal: !showOriginal');
    expect(source).toContain('showTranslation: !showTranslation');
    expect(source).toContain("${showOriginal ? '隐藏' : '显示'}第 ${sentence.displayNumber} 句原文");
    expect(source).toContain("${showTranslation ? '隐藏' : '显示'}第 ${sentence.displayNumber} 句译文");
    expect(source).toContain('disabled={!hasOriginal || sentence.visibilityControlsDisabled}');
    expect(source).toContain('disabled={!hasTranslation || sentence.visibilityControlsDisabled}');
  });

  test('loads and saves article sentence preferences through the user endpoint', async () => {
    const source = await Bun.file(
      new URL('../src/pages/article/index.tsx', import.meta.url)
    ).text();

    expect(source).toContain('/sentence-visibility`), {');
    expect(source).toContain('axios.patch(`/api/user/articles/${encodeURIComponent(id)}/sentence-visibility`');
  });
});
