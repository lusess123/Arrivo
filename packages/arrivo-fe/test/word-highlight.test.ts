import { describe, expect, test } from 'bun:test';
import {
  buildWordTextSegments,
  findActiveWordIndex,
  findPauseActiveWordIndex,
} from '../src/pages/article/word-highlight';

const words = [
  { text: 'Hello', offsetMs: 100, durationMs: 300 },
  { text: 'world', offsetMs: 500, durationMs: 250 },
];

describe('word highlight', () => {
  test('preserves spaces and punctuation around mapped words', () => {
    expect(buildWordTextSegments('Hello, world!', words)).toEqual([
      { text: 'Hello', wordIndex: 0 },
      { text: ', ' },
      { text: 'world', wordIndex: 1 },
      { text: '!' },
    ]);
  });

  test('selects the word for the current audio position', () => {
    expect(findActiveWordIndex(words, 99)).toBe(-1);
    expect(findActiveWordIndex(words, 300)).toBe(0);
    expect(findActiveWordIndex(words, 600)).toBe(1);
    expect(findActiveWordIndex(words, 800)).toBe(-1);
  });

  test('spreads words evenly across a pause and keeps the final word highlighted', () => {
    expect(findPauseActiveWordIndex(words, 0, 1_000)).toBe(0);
    expect(findPauseActiveWordIndex(words, 499, 1_000)).toBe(0);
    expect(findPauseActiveWordIndex(words, 500, 1_000)).toBe(1);
    expect(findPauseActiveWordIndex(words, 1_000, 1_000)).toBe(1);
    expect(findPauseActiveWordIndex(words, 1_500, 1_000)).toBe(1);
  });
});
