export type ApiSuccess<T> = {
  statusCode: number;
  timestamp: string;
  responseTime: number;
  requestId: string;
  data: T;
};

export type ApiFailure = {
  statusCode: number;
  timestamp: string;
  requestId: string;
  code: string;
  message: string;
  data?: unknown;
};
