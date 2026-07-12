import { createApiApp } from "../app-factory";
import { runWithDbClientFactory, runWithTtsRuntime } from "@arrivo/application";
import { createDb } from "@arrivo/db";
import { createR2TtsAssetCache, edgeVoiceClient } from "@arrivo/infra";
import { getDatabaseConnectionString, type ArrivoWorkerEnv } from "@arrivo/runtime";

const app = createApiApp();

export default {
  fetch(request: Request, env: ArrivoWorkerEnv, executionCtx: ExecutionContext) {
    return runWithDbClientFactory({
      createDb: () =>
        createDb({
          connectionString: getDatabaseConnectionString(env),
          schema: env.DATABASE_SCHEMA
        }),
      run: () =>
        runWithTtsRuntime({
          assetCache: createR2TtsAssetCache(env.AUDIO_BUCKET),
          defaultVoice: env.TTS_DEFAULT_VOICE || "en-US-AndrewNeural",
          voiceClient: edgeVoiceClient,
          run: () => app.fetch(request, env, executionCtx)
        })
    });
  }
};
