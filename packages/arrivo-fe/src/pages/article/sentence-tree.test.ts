import { describe, expect, test } from 'bun:test';
import { buildSentenceTree, getPlayableSentences, getSentenceDisplayRows } from './sentence-tree';

const sentences = [
  { id: 'a', originalContent: 'A', translatedContent: '甲', sortOrder: 1000, parentSentenceId: null, splitStatus: 'SPLIT' as const },
  { id: 'b', originalContent: 'B', translatedContent: '乙', sortOrder: 2000, parentSentenceId: null, splitStatus: 'UNSPLITTABLE' as const },
  { id: 'a1', originalContent: 'A1', translatedContent: '甲一', sortOrder: 1000, parentSentenceId: 'a', splitStatus: 'UNSPLITTABLE' as const },
  { id: 'a2', originalContent: 'A2', translatedContent: '甲二', sortOrder: 2000, parentSentenceId: 'a', splitStatus: 'SPLIT' as const },
  { id: 'a21', originalContent: 'A21', translatedContent: '甲二一', sortOrder: 1000, parentSentenceId: 'a2', splitStatus: 'UNSPLITTABLE' as const },
];

describe('sentence tree playback', () => {
  test('collapsed parents replace descendants in the playable queue', () => {
    const rows = getSentenceDisplayRows(buildSentenceTree(sentences), new Set());
    expect(getPlayableSentences(rows).map((item) => item.id)).toEqual(['a', 'b']);
  });

  test('expanded parents are traversed depth first', () => {
    const rows = getSentenceDisplayRows(buildSentenceTree(sentences), new Set(['a', 'a2']));
    expect(rows.map((row) => row.sentence.id)).toEqual(['a', 'a1', 'a2', 'a21', 'b']);
    expect(getPlayableSentences(rows).map((item) => item.id)).toEqual(['a1', 'a21', 'b']);
  });
});
