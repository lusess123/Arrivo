import type { TtsWordBoundaryDto, VoicePackageDto } from "@arrivo/contracts";

const BASE_URL = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = `wss://${BASE_URL}/edge/v1`;
const VOICE_LIST_URL = `https://${BASE_URL}/voices/list`;
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
const SEC_MS_GEC_VERSION = "1-143.0.3650";
const WIN_EPOCH = 11644473600;
const EDGE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  `Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`;

export type SynthesizeSpeechInput = {
  text: string;
  voice: string;
  rate?: number;
  volume?: number;
  pitch?: number;
};

export type VoiceClient = {
  listVoices(lang?: string): Promise<VoicePackageDto[]>;
  synthesize(input: SynthesizeSpeechInput): Promise<{
    audio: ArrayBuffer;
    words: TtsWordBoundaryDto[];
  }>;
};

function connectId() {
  return crypto.randomUUID();
}

function token32() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function edgeHeaders() {
  return {
    "User-Agent": EDGE_USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: `MUID=${token32()}`
  };
}

function dateToString() {
  return new Date().toUTCString();
}

async function sha256Hex(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function generateSecMsGec() {
  let ticks = Date.now() / 1000;
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 10_000_000;
  return sha256Hex(`${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`);
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function percent(value = 0) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function pitch(value = 0) {
  return `${value > 0 ? "+" : ""}${value}Hz`;
}

function mkssml(input: SynthesizeSpeechInput) {
  return [
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>",
    `<voice name='${input.voice}'>`,
    `<prosody pitch='${pitch(input.pitch)}' rate='${percent(input.rate)}' volume='${percent(input.volume)}'>`,
    escapeXml(input.text),
    "</prosody>",
    "</voice>",
    "</speak>"
  ].join("");
}

function speechConfigMessage() {
  return [
    `X-Timestamp:${dateToString()}`,
    "Content-Type:application/json; charset=utf-8",
    "Path:speech.config",
    "",
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: "false",
              wordBoundaryEnabled: "true"
            },
            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
          }
        }
      }
    }),
    ""
  ].join("\r\n");
}

function ssmlMessage(input: SynthesizeSpeechInput) {
  return [
    `X-RequestId:${connectId()}`,
    "Content-Type:application/ssml+xml",
    `X-Timestamp:${dateToString()}`,
    "Path:ssml",
    "",
    mkssml(input)
  ].join("\r\n");
}

function parseTextMessage(data: string) {
  const end = data.indexOf("\r\n\r\n");
  const header = end === -1 ? data : data.slice(0, end);
  const match = header.match(/^Path:(.+)$/im);
  return {
    path: match?.[1]?.trim(),
    body: end === -1 ? "" : data.slice(end + 4).trim()
  };
}

function decodeXmlEntities(text: string) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function parseEdgeWordBoundaries(data: string): TtsWordBoundaryDto[] {
  if (!data) return [];
  const payload = JSON.parse(data) as {
    Metadata?: Array<{
      Type?: string;
      Data?: {
        Offset?: number;
        Duration?: number;
        text?: {
          Text?: string;
        };
      };
    }>;
  };

  return (payload.Metadata ?? []).flatMap((entry) => {
    const offset = entry.Data?.Offset;
    const duration = entry.Data?.Duration;
    const text = entry.Data?.text?.Text;
    if (
      entry.Type !== "WordBoundary" ||
      typeof text !== "string" ||
      !Number.isFinite(offset) ||
      !Number.isFinite(duration)
    ) {
      return [];
    }
    return [{
      text: decodeXmlEntities(text),
      offsetMs: Math.round((offset as number) / 10_000),
      durationMs: Math.round((duration as number) / 10_000)
    }];
  });
}

function parseBinaryMessage(data: ArrayBuffer) {
  const bytes = new Uint8Array(data);
  if (bytes.length < 2) return undefined;
  const headerLength = (bytes[0] << 8) + bytes[1];
  if (headerLength > bytes.length - 2) return undefined;
  const header = new TextDecoder().decode(bytes.slice(2, 2 + headerLength));
  const path = header.match(/^Path:(.+)$/im)?.[1]?.trim();
  const bodyOffset = 2 + headerLength;
  return {
    path,
    body: bytes.slice(bodyOffset)
  };
}

async function toArrayBuffer(data: unknown): Promise<ArrayBuffer | undefined> {
  if (data instanceof ArrayBuffer) return data;
  if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return data.arrayBuffer();
  }
  return undefined;
}

export async function listEdgeVoices(lang?: string): Promise<VoicePackageDto[]> {
  const url = `${VOICE_LIST_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${await generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  const response = await fetch(url, {
    headers: {
      ...edgeHeaders(),
      Accept: "*/*",
      "Accept-Encoding": "identity"
    }
  });
  if (!response.ok) throw new Error(`Edge voice list failed: ${response.status}`);
  const raw = (await response.json()) as
    | Array<{
        ShortName: string;
        Gender?: string;
        Locale?: string;
        FriendlyName?: string;
      }>
    | {
        voices?: Array<{
          ShortName: string;
          Gender?: string;
          Locale?: string;
          FriendlyName?: string;
        }>;
      };
  const voices = Array.isArray(raw) ? raw : (raw.voices ?? []);
  return voices
    .map((voice) => ({
      name: voice.ShortName,
      gender: voice.Gender,
      locale: voice.Locale,
      displayName: voice.FriendlyName
    }))
    .filter((voice) => !lang || voice.name.includes(`${lang}-`));
}

async function createEdgeSocket(url: string) {
  const upgradeUrl = url.replace(/^wss:/, "https:");
  const response = await fetch(upgradeUrl, {
    headers: {
      ...edgeHeaders(),
      Upgrade: "websocket"
    }
  });
  const socket = response.webSocket;
  if (!socket) {
    response.body?.cancel();
    throw new Error(`Edge TTS websocket rejected: ${response.status} ${response.statusText}`);
  }
  socket.binaryType = "arraybuffer";
  socket.accept();
  return socket;
}

export async function synthesizeWithEdge(input: SynthesizeSpeechInput): Promise<{
  audio: ArrayBuffer;
  words: TtsWordBoundaryDto[];
}> {
  const requestId = connectId();
  const url = `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${await generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${requestId}`;
  const chunks: Uint8Array[] = [];
  const words: TtsWordBoundaryDto[] = [];

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };
    let socket: WebSocket | undefined;
    const timeout = setTimeout(() => {
      socket?.close();
      settle(() => reject(new Error("Edge TTS timeout")));
    }, 60_000);

    void createEdgeSocket(url)
      .then((connectedSocket) => {
        socket = connectedSocket;
        socket.addEventListener("message", (event) => {
          void (async () => {
            if (typeof event.data === "string") {
              const message = parseTextMessage(event.data);
              if (message.path === "audio.metadata") {
                words.push(...parseEdgeWordBoundaries(message.body));
              }
              if (message.path === "turn.end") {
                socket?.close();
                const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                const output = new Uint8Array(size);
                let offset = 0;
                for (const chunk of chunks) {
                  output.set(chunk, offset);
                  offset += chunk.byteLength;
                }
                settle(() => resolve({
                  audio: output.buffer as ArrayBuffer,
                  words
                }));
              }
              return;
            }

            const buffer = await toArrayBuffer(event.data);
            if (!buffer) return;
            const parsed = parseBinaryMessage(buffer);
            if (parsed?.path === "audio" && parsed.body.byteLength > 0) {
              chunks.push(parsed.body);
            }
          })().catch((error: unknown) => {
            settle(() => reject(error));
          });
        });
        socket.addEventListener("error", () => {
          settle(() => reject(new Error("Edge TTS websocket error")));
        });
        socket.addEventListener("close", () => {
          if (!settled && !chunks.length) {
            settle(() => reject(new Error("Edge TTS returned no audio")));
          }
        });

        socket.send(speechConfigMessage());
        socket.send(ssmlMessage(input));
      })
      .catch((error: unknown) => {
        settle(() => reject(error));
      });
  });
}

export const edgeVoiceClient: VoiceClient = {
  listVoices: listEdgeVoices,
  synthesize: synthesizeWithEdge
};
