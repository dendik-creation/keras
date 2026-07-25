/** Timestamp-prefixed console wrapper — every log line starts with an ISO-8601 timestamp. Works client and server side. */
function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  log: (...args: unknown[]) => console.log(`[${timestamp()}]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${timestamp()}]`, ...args),
  error: (...args: unknown[]) => console.error(`[${timestamp()}]`, ...args),
};
