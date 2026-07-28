/** Timestamp-prefixed console wrapper — every log line starts with a local "YYYY-MM-DD HH:mm:ss" timestamp. Works client and server side. */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${timestamp()}]`, ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[${timestamp()}]`, ...args);
    }
  },
  error: (...args: unknown[]) => console.error(`[${timestamp()}]`, ...args),
};
