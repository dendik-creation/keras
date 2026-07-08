export type LoginCredentials = {
  username: string;
  password: string;
};

/**
 * Normalize the login request body.
 * Mirrors the original destructuring behaviour (missing fields become "").
 */
export function parseLoginBody(body: unknown): LoginCredentials {
  const { username, password } = (body ?? {}) as Partial<LoginCredentials>;
  return {
    username: username ?? "",
    password: password ?? "",
  };
}
