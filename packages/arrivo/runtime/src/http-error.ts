import {
  createHttpError,
  HttpError,
  isHttpError,
  type HttpErrorStatus
} from "@open-kit/infra/errors/http-error";

function makeError(status: HttpErrorStatus, code: string, message: string, details?: unknown) {
  return createHttpError({ status, code, message, details });
}

export { HttpError, isHttpError };

export const httpError = {
  badRequest(message: string, details?: unknown) {
    return makeError(400, "BAD_REQUEST", message, details);
  },
  unauthorized(message = "请先登录", details?: unknown) {
    return makeError(401, "UNAUTHORIZED", message, details);
  },
  forbidden(message = "权限不足", details?: unknown) {
    return makeError(403, "FORBIDDEN", message, details);
  },
  notFound(message = "资源不存在", details?: unknown) {
    return makeError(404, "NOT_FOUND", message, details);
  },
  internal(message = "服务器错误", details?: unknown) {
    return makeError(500, "INTERNAL_ERROR", message, details);
  }
};
