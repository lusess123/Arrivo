import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ttsAudioQuerySchema, ttsVoicesQuerySchema, ttsWordsQuerySchema } from "@arrivo/contracts";
import { getAudio, getVoices, getWords } from "@arrivo/application";
import type { AppEnv } from "../context";
import { ok } from "../http";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

export function registerTtsRoutes(app: Hono<AppEnv>, prefix = "") {
  app.get(route(prefix, "/tts/voices"), zValidator("query", ttsVoicesQuerySchema), async (c) => {
    const input = c.req.valid("query");
    return ok(c, await getVoices(input.lang));
  });

  app.get(route(prefix, "/tts/audio"), zValidator("query", ttsAudioQuerySchema), async (c) => {
    const input = c.req.valid("query");
    const audio = await getAudio({
      text: input.s,
      voice: input.v
    });
    return new Response(audio.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="${encodeURIComponent(input.s)}.mp3"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Arrivo-Audio-Key": audio.key,
        "X-Arrivo-Cache": audio.fromCache ? "HIT" : "MISS"
      }
    });
  });

  app.get(route(prefix, "/tts/words"), zValidator("query", ttsWordsQuerySchema), async (c) => {
    const input = c.req.valid("query");
    const result = await getWords({
      text: input.s,
      voice: input.v
    });
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    c.header("X-Arrivo-Words-Key", result.key);
    c.header("X-Arrivo-Cache", result.fromCache ? "HIT" : "MISS");
    return ok(c, { words: result.words });
  });

  app.get(route(prefix, "/text"), zValidator("query", ttsAudioQuerySchema), async (c) => {
    const input = c.req.valid("query");
    const audio = await getAudio({
      text: input.s,
      voice: input.v
    });
    return new Response(audio.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="${encodeURIComponent(input.s)}.mp3"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Arrivo-Audio-Key": audio.key,
        "X-Arrivo-Cache": audio.fromCache ? "HIT" : "MISS"
      }
    });
  });
}
