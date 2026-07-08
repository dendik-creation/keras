/**
 * Error carrying an HTTP status + JSON payload.
 * Thrown inside services/validators, mapped to a NextResponse by controllers.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly payload: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    payload: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.payload = payload;
  }
}

/** 400 Bad Request — invalid/missing input. */
export class ValidationError extends HttpError {
  constructor(message: string, payload: Record<string, unknown> = {}) {
    super(400, message, payload);
    this.name = "ValidationError";
  }
}

export const isHttpError = (err: unknown): err is HttpError =>
  err instanceof HttpError;
