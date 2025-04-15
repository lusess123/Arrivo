import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
// import { BusinessError } from './business.error';
// import api, { SpanStatusCode } from '@opentelemetry/api';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.log('报错了：');
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception.message || 'Internal server error';
    const stack = exception instanceof Error ? exception.stack : null;

    // 输出异常到控制台
    console.error('Exception caught:', exception);
    // if (exception instanceof BusinessError) {
    //   const currentSpan = api.trace.getSpan(api.context.active());
    //   currentSpan?.setStatus({ code: SpanStatusCode.OK, message }); // 标记为成功（即便发生业务错误）
    // }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      data: exception?.data,
      message: message,
      stack: stack,
    });
  }
}
