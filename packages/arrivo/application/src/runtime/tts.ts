import { AsyncLocalStorage } from "node:async_hooks";
import type { TtsAssetCache, VoiceClient } from "@arrivo/infra";

type TtsRuntime = {
  assetCache: TtsAssetCache;
  defaultVoice: string;
  voiceClient: VoiceClient;
};

const ttsStorage = new AsyncLocalStorage<TtsRuntime>();

export function runWithTtsRuntime<T>({ run, ...runtime }: TtsRuntime & { run: () => T }) {
  return ttsStorage.run(runtime, run);
}

export function getTtsRuntime() {
  const runtime = ttsStorage.getStore();
  if (!runtime) {
    throw new Error("TTS runtime is not configured.");
  }
  return runtime;
}
