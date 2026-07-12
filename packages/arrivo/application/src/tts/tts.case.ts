import type { TtsWordBoundaryDto, VoicePackageDto } from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import { getTtsRuntime } from "../runtime/tts";

type GeneratedAsset = {
  audio: ArrayBuffer;
  words: TtsWordBoundaryDto[];
};

const pendingAssets = new Map<string, Promise<GeneratedAsset>>();

async function sha256Hex(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getVoices(lang?: string): Promise<VoicePackageDto[]> {
  return getTtsRuntime().voiceClient.listVoices(lang);
}

async function getAssetKeys(text: string, voice: string) {
  const hash = await sha256Hex(`${voice}:${text}`);
  const prefix = `edge-tts/${voice}/${hash}`;
  return {
    audioKey: `${prefix}.mp3`,
    wordsKey: `${prefix}.words.json`
  };
}

function generateAsset({
  audioKey,
  text,
  voice,
  wordsKey
}: {
  audioKey: string;
  text: string;
  voice: string;
  wordsKey: string;
}) {
  const current = pendingAssets.get(audioKey);
  if (current) return current;

  const { assetCache, voiceClient } = getTtsRuntime();
  const pending = voiceClient.synthesize({
    text,
    voice,
    rate: 0,
    volume: 10,
    pitch: 10
  }).then(async (asset) => {
    await Promise.all([
      assetCache.putAudio({ key: audioKey, body: asset.audio, voice }),
      assetCache.putWords({ key: wordsKey, words: asset.words, voice })
    ]);
    return asset;
  });

  pendingAssets.set(audioKey, pending);
  pending.then(
    () => pendingAssets.delete(audioKey),
    () => pendingAssets.delete(audioKey)
  );
  return pending;
}

export async function getAudio({
  text,
  voice
}: {
  text: string;
  voice?: string;
}) {
  if (!text) throw httpError.badRequest("缺少音频文件参数");
  const { assetCache, defaultVoice } = getTtsRuntime();
  const selectedVoice = voice || defaultVoice;
  const { audioKey, wordsKey } = await getAssetKeys(text, selectedVoice);
  const [cachedAudio, cachedWords] = await Promise.all([
    assetCache.getAudio(audioKey),
    assetCache.getWords(wordsKey)
  ]);
  if (cachedAudio && cachedWords) {
    return {
      body: cachedAudio,
      key: audioKey,
      fromCache: true
    };
  }

  const asset = await generateAsset({
    audioKey,
    text,
    voice: selectedVoice,
    wordsKey
  });
  return {
    body: asset.audio,
    key: audioKey,
    fromCache: false
  };
}

export async function getWords({
  text,
  voice
}: {
  text: string;
  voice?: string;
}) {
  if (!text) throw httpError.badRequest("缺少音频文件参数");
  const { assetCache, defaultVoice } = getTtsRuntime();
  const selectedVoice = voice || defaultVoice;
  const { audioKey, wordsKey } = await getAssetKeys(text, selectedVoice);
  const cachedWords = await assetCache.getWords(wordsKey);
  if (cachedWords) {
    return {
      words: cachedWords,
      key: wordsKey,
      fromCache: true
    };
  }

  const asset = await generateAsset({
    audioKey,
    text,
    voice: selectedVoice,
    wordsKey
  });
  return {
    words: asset.words,
    key: wordsKey,
    fromCache: false
  };
}
