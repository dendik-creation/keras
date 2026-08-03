/** Timestamp-prefixed console wrapper — every log line starts with a local "YYYY-MM-DD HH:mm:ss" timestamp. Works client and server side. */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const formatTimestamp = () => {
  const ts = timestamp();
  if (typeof window === "undefined") {
    // Server-side: Use ANSI escape codes (Cyan color)
    return `\x1b[36m[${ts}]\x1b[0m`;
  }
  return `[${ts}]`;
};

export const logger = {
  log: (...args: unknown[]) => console.log(formatTimestamp(), ...args),
  info: (...args: unknown[]) => console.info(formatTimestamp(), ...args),
  warn: (...args: unknown[]) => console.warn(formatTimestamp(), ...args),
  error: (...args: unknown[]) => console.error(formatTimestamp(), ...args),
};
