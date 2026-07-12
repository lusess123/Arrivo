export type IdGenerator = {
  next(prefix: string): string;
};

export function createIdGenerator(): IdGenerator {
  return {
    next(prefix: string) {
      const body = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
      return `${prefix}_${body}`;
    }
  };
}

export function createUuidV7(date = new Date()) {
  const bytes = new Uint8Array(16);
  let timestamp = BigInt(date.getTime());
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }
  crypto.getRandomValues(bytes.subarray(6));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
