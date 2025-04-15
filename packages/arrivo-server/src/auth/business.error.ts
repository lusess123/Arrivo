import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessError extends HttpException {
  constructor(
    public readonly message: string,
    public readonly data?: any,
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    if (!data) {
      this.data = message;
    }
  }
}
