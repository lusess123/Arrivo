export type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export function createLogger({ scope = "edu-tree" }: { scope?: string } = {}): Logger {
  function write(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
    const payload = {
      level,
      scope,
      message,
      time: new Date().toISOString(),
      ...(meta ? { meta } : {})
    };
    console[level](JSON.stringify(payload));
  }

  return {
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta)
  };
}
