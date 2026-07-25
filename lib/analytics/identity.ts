/** Keep the first 6 digits real, mask the rest (e.g. 202451234 -> 202451***). */
export function maskNim(nim: string): string {
  if (!nim) return "";
  const visible = nim.slice(0, 6);
  const masked = "*".repeat(Math.max(nim.length - 6, 0));
  return visible + masked;
}

/**
 * Deterministic, non-reversible id derived from the full NIM.
 * Used as the analytics distinct id so unique-user counts stay accurate
 * while the raw NIM is never sent anywhere.
 */
export async function hashNim(nim: string): Promise<string> {
  const data = new TextEncoder().encode(nim);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "keras_" + hex.slice(0, 16);
}
