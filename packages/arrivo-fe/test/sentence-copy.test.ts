import { describe, expect, test } from 'bun:test';
import { copySentenceText } from '../src/pages/article/sentence-copy';

describe('sentence copy', () => {
  test('copies the displayed sentence text without changing it', async () => {
    const copied: string[] = [];

    await copySentenceText('  Exact sentence.\n', {
      writeText: async (text) => {
        copied.push(text);
      }
    });

    expect(copied).toEqual(['  Exact sentence.\n']);
  });

  test('reports clipboard failures to the caller', async () => {
    const copy = copySentenceText('Sentence', {
      writeText: async () => {
        throw new Error('Clipboard unavailable');
      }
    });

    await expect(copy).rejects.toThrow('Clipboard unavailable');
  });

  test('renders separate copy actions for the original and translated text', async () => {
    const source = await Bun.file(
      new URL('../src/pages/article/sentence.item.tsx', import.meta.url)
    ).text();

    expect(source).toContain("handleCopy(sentence.originalContent, '原文')");
    expect(source).toContain("handleCopy(sentence.translatedContent, '译文')");
    expect(source).toContain('复制第 ${sentence.displayNumber} 句原文');
    expect(source).toContain('复制第 ${sentence.displayNumber} 句译文');
  });
});
