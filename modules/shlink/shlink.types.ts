/** Shlink's raw response to POST /rest/v3/short-urls. */
export type ShlinkCreateShortUrlResponse = {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
};

/** Shlink's raw response to GET /rest/v3/short-urls/{shortCode}. */
export type ShlinkShortUrlDetails = {
  shortCode: string;
  longUrl: string;
};

/** Shlink's Problem Details error body (RFC 7807). */
export type ShlinkErrorResponse = {
  title?: string;
  type?: string;
  detail?: string;
  status?: number;
};
