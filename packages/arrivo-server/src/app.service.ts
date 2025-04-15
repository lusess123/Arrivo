import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'arrivo-db';

const prisma = new PrismaClient();
// prisma.

export async function testDb() {
  const user = await prisma.user.findMany();
  console.log(user);
  return user;
}

export const asyncHandle = <T, U = any>(
  promise: Promise<T>,
): Promise<[U | null, T | null]> => {
  if (!promise || typeof promise.then !== 'function') {
    return Promise.reject(new Error('requires promises as the param')).catch(
      (err: U) => {
        return [err, null];
      },
    );
  }

  return promise
    .then((result: T): [null, T] => {
      return [null, result];
    })
    .catch((err: U): [U, null] => {
      return [err, null];
    });
};

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  async testDb() {
    return testDb();
  }
}
