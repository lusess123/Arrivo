import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'arrivo-db';
import { AuthService } from '../auth/auth.service';
import { generateUniqueId } from './db';

export const aa = '123';

@Injectable()
export class BasePrisma extends PrismaClient implements OnModuleInit {
  constructor(protected readonly auth: AuthService) {
    super();
  }
  async onModuleInit() {
    // Note: this is optional
    await this.$connect();
  }

  public generateUniqueId() {
    return generateUniqueId();
  }

  getUserId() {
    return this.auth.getUserId();
  }
}
