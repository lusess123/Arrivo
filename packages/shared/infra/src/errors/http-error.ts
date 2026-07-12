export type HttpErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502;

export class HttpError extends Error {
  readonly status: HttpErrorStatus;
  readonly code: string;
  readonly details?: unknown;

  constructor({
    status,
    code,
    message,
    details
  }: {
    status: HttpErrorStatus;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function createHttpError(input: {
  status: HttpErrorStatus;
  code: string;
  message: string;
  details?: unknown;
}): HttpError {
  return new HttpError(input);
}

type RaiseInput = {
  code: string;
  message: string;
  details?: unknown;
};

export const httpError = {
  badRequest(input: RaiseInput): HttpError {
    return createHttpError({ status: 400, ...input });
  },
  unauthorized(input: RaiseInput): HttpError {
    return createHttpError({ status: 401, ...input });
  },
  forbidden(input: RaiseInput): HttpError {
    return createHttpError({ status: 403, ...input });
  },
  notFound(input: RaiseInput): HttpError {
    return createHttpError({ status: 404, ...input });
  },
  conflict(input: RaiseInput): HttpError {
    return createHttpError({ status: 409, ...input });
  },
  unprocessable(input: RaiseInput): HttpError {
    return createHttpError({ status: 422, ...input });
  },
  tooManyRequests(input: RaiseInput): HttpError {
    return createHttpError({ status: 429, ...input });
  },
  badGateway(input: RaiseInput): HttpError {
    return createHttpError({ status: 502, ...input });
  },
  internal(input: RaiseInput): HttpError {
    return createHttpError({ status: 500, ...input });
  }
};
