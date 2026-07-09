import axios from "axios";
import { envVariable } from "@/lib/utils";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyResult = {
  success: boolean;
  errorCodes?: string[];
};

/**
 * Verify a Cloudflare Turnstile token against Cloudflare's siteverify API.
 * `remoteip` is optional but recommended when available.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteip?: string,
): Promise<TurnstileVerifyResult> {
  const secret = envVariable.TURNSTILE_SECRET_KEY;

  // If no secret is configured, treat the challenge as disabled (allow).
  if (!secret) {
    return { success: true };
  }

  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteip) form.append("remoteip", remoteip);

  const response = await axios.post(SITEVERIFY_URL, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return {
    success: response.data?.success === true,
    errorCodes: response.data?.["error-codes"],
  };
}
