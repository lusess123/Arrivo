import { describe, expect, test } from 'bun:test';
import {
  buildSentenceTree,
  getMissingSentenceGroups,
  getPlayableSentences,
  getSentenceDisplayRows,
  mergeGeneratedSentences
} from './sentence-tree';

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
    expect(rows.map((row) => row.displayNumber)).toEqual(['1', '1.1', '1.2', '1.2.1', '2']);
    expect(getPlayableSentences(rows).map((item) => item.id)).toEqual(['a1', 'a21', 'b']);
  });

  test('keeps each learning language in an independent tree', () => {
    const parallel = [
      { ...sentences[0], languageCode: 'en', sentenceGroupId: 'group-a' },
      {
        ...sentences[1],
        id: 'vi-a',
        languageCode: 'vi',
        sentenceGroupId: 'group-a',
        parentSentenceId: null,
        originalContent: 'Xin chào'
      }
    ] as any;

    expect(buildSentenceTree(parallel, 'en').map((item) => item.id)).toEqual(['a']);
    expect(buildSentenceTree(parallel, 'vi').map((item) => item.id)).toEqual(['vi-a']);
    expect(getMissingSentenceGroups(parallel, 'fi')).toEqual([
      { sentenceGroupId: 'group-a', sortOrder: 1000 }
    ]);
  });

  test('keeps both languages when generation snapshots arrive out of order', () => {
    const english = { id: 'en-root', languageCode: 'en', sentenceGroupId: 'group-a', parentSentenceId: null };
    const vietnamese = { id: 'vi-root', languageCode: 'vi', sentenceGroupId: 'group-a', parentSentenceId: null };
    const finnish = { id: 'fi-root', languageCode: 'fi', sentenceGroupId: 'group-a', parentSentenceId: null };
    const afterFinnish = mergeGeneratedSentences(
      [english, vietnamese],
      [english, vietnamese, finnish],
      'fi'
    );
    const afterStaleVietnamese = mergeGeneratedSentences(afterFinnish, [english, vietnamese], 'vi');

    expect(afterStaleVietnamese.map((sentence) => sentence.languageCode)).toEqual(['en', 'vi', 'fi']);
  });

  test('does not overwrite edits or revive groups from a stale generation snapshot', () => {
    const editedEnglish = {
      id: 'en-root',
      sentenceGroupId: 'group-a',
      parentSentenceId: null,
      originalContent: 'Edited locally'
    };
    const staleEnglish = { ...editedEnglish, originalContent: 'Stale response' };
    const generatedVietnamese = {
      id: 'vi-root',
      languageCode: 'vi',
      sentenceGroupId: 'group-a',
      parentSentenceId: null,
      originalContent: 'Generated Vietnamese'
    };

    expect(mergeGeneratedSentences([editedEnglish], [staleEnglish, generatedVietnamese], 'vi')).toEqual([
      editedEnglish,
      generatedVietnamese
    ]);
    expect(mergeGeneratedSentences([], [staleEnglish, generatedVietnamese], 'vi')).toEqual([]);
  });

  test('does not revive replaced child clauses from a stale generation snapshot', () => {
    const english = { id: 'en-root', languageCode: 'en', sentenceGroupId: 'group-a', parentSentenceId: null };
    const vietnamese = { id: 'vi-root', languageCode: 'vi', sentenceGroupId: 'group-a', parentSentenceId: null };
    const currentChild = { id: 'new-child', languageCode: 'en', sentenceGroupId: 'group-a', parentSentenceId: 'en-root' };
    const staleChild = { id: 'old-child', languageCode: 'en', sentenceGroupId: 'group-a', parentSentenceId: 'en-root' };

    expect(mergeGeneratedSentences(
      [english, currentChild],
      [english, staleChild, vietnamese],
      'vi'
    )).toEqual([english, currentChild, vietnamese]);
  });
});
