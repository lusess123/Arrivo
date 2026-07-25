import type { Context, Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ttsAudioQuerySchema, ttsVoicesQuerySchema, ttsWordsQuerySchema } from "@arrivo/contracts";
import { getAudio, getVoices, getWords } from "@arrivo/application";
import type { AppEnv } from "../context";
import { ok } from "../http";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

function parseByteRange(range: string | undefined, totalBytes: number) {
  if (!range) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(0, totalBytes - suffixLength),
      end: totalBytes - 1
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : totalBytes - 1;
  if (
    !Number.isInteger(start)
    || !Number.isInteger(requestedEnd)
    || start < 0
    || start >= totalBytes
    || requestedEnd < start
  ) return null;

  return { start, end: Math.min(requestedEnd, totalBytes - 1) };
}

async function audioResponse(
  c: Context<AppEnv>,
  audio: Awaited<ReturnType<typeof getAudio>>,
  text: string,
) {
  const bytes = await new Response(audio.body).arrayBuffer();
  const range = parseByteRange(c.req.header("Range"), bytes.byteLength);
  const headers = {
    "Content-Type": "audio/mpeg",
    "Content-Disposition": `inline; filename="${encodeURIComponent(text)}.mp3"`,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Arrivo-Audio-Key": audio.key,
    "X-Arrivo-Cache": audio.fromCache ? "HIT" : "MISS"
  };

  if (range === null) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${bytes.byteLength}` }
    });
  }

  if (!range) {
    return new Response(bytes, {
      headers: { ...headers, "Content-Length": String(bytes.byteLength) }
    });
  }

  const body = bytes.slice(range.start, range.end + 1);
  return new Response(body, {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(body.byteLength),
      "Content-Range": `bytes ${range.start}-${range.end}/${bytes.byteLength}`
    }
  });
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
    return audioResponse(c, audio, input.s);
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
    return audioResponse(c, audio, input.s);
  });
}
