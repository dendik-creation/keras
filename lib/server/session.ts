import { cookies } from "next/headers";

/** Name of the cookie mirroring the student's KRS session. */
export const SESSION_COOKIE_NAME = "external_session";

const SESSION_MAX_AGE = 60 * 60 * 2; // 120 minutes

/** Read the external session cookie, or `undefined` when absent. */
export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME);
}

/** Persist the KRS session cookie chain as a single httpOnly cookie. */
export async function setSessionCookie(value: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Drop the external session cookie (logout). */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
