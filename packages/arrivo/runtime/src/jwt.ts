import type { AuthUserDto } from "@arrivo/contracts";
import { httpError } from "./http-error";

type JwtPayload = AuthUserDto & {
  exp: number;
  iat: number;
};

const encoder = new TextEncoder();

function base64UrlEncode(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signUserJwt(input: {
  user: AuthUserDto;
  secret: string;
  expiresSeconds: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({ ...input.user, iat: now, exp: now + input.expiresSeconds })
  );
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await getKey(input.secret), encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function verifyUserJwt(token: string, secret: string): Promise<AuthUserDto> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) throw httpError.unauthorized();
  const signingInput = `${header}.${payload}`;
  const expected = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(signingInput));
  if (base64UrlEncode(expected) !== signature) throw httpError.unauthorized();
  const parsed = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    throw httpError.unauthorized("登录已过期");
  }
  const { exp: _exp, iat: _iat, ...user } = parsed;
  return user;
}
