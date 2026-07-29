export type LoginCredentials = {
  username: string;
  password: string;
  avatarFetched?: boolean;
  avatarUrl?: string | null;
};

/**
 * Normalize the login request body.
 * Mirrors the original destructuring behaviour (missing fields become "").
 */
export function parseLoginBody(body: unknown): LoginCredentials {
  const { username, password, avatarFetched, avatarUrl } = (body ?? {}) as Partial<LoginCredentials>;
  return {
    username: username ?? "",
    password: password ?? "",
    avatarFetched: avatarFetched ?? false,
    avatarUrl: avatarUrl ?? null,
  };
}
