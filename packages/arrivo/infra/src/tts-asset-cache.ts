import type { TtsWordBoundaryDto } from "@arrivo/contracts";

export type AudioBody = ReadableStream<Uint8Array> | ArrayBuffer;

type WordsDocument = {
  version: 1;
  words: TtsWordBoundaryDto[];
};

export type TtsAssetCache = {
  getAudio(key: string): Promise<AudioBody | undefined>;
  getWords(key: string): Promise<TtsWordBoundaryDto[] | undefined>;
  putAudio(input: { key: string; body: ArrayBuffer; voice: string }): Promise<void>;
  putWords(input: { key: string; words: TtsWordBoundaryDto[]; voice: string }): Promise<void>;
};

export function createR2TtsAssetCache(bucket: R2Bucket): TtsAssetCache {
  return {
    async getAudio(key) {
      const object = await bucket.get(key);
      return object?.body;
    },
    async getWords(key) {
      const object = await bucket.get(key);
      if (!object) return undefined;
      try {
        const document = await object.json<WordsDocument>();
        return document.version === 1 && Array.isArray(document.words) ? document.words : undefined;
      } catch {
        return undefined;
      }
    },
    async putAudio({ key, body, voice }) {
      await bucket.put(key, body, {
        httpMetadata: {
          contentType: "audio/mpeg"
        },
        customMetadata: {
          voice
        }
      });
    },
    async putWords({ key, words, voice }) {
      const document: WordsDocument = {
        version: 1,
        words
      };
      await bucket.put(key, JSON.stringify(document), {
        httpMetadata: {
          contentType: "application/json; charset=utf-8"
        },
        customMetadata: {
          voice
        }
      });
    }
  };
}
