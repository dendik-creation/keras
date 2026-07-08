import https from "https";

/**
 * Build an https.Agent for talking to the KRS host.
 * keepAlive + relaxed TLS (campus cert) by default; override via `options`.
 */
export function createKeepAliveAgent(options?: https.AgentOptions) {
  return new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false,
    ...options,
  });
}
