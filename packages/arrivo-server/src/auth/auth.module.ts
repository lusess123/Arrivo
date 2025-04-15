import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { AttachUserMiddleware } from './attach-user.middleware';
// import { UserService } from '../business/user.service';
import { BasePrisma } from './base-prisma';
import { UserService } from './user.service';
import { AppConfigService } from './appconfig.service';

@Module({
  providers: [AuthService, UserService, BasePrisma, AppConfigService],
  controllers: [AuthController],
  imports: [
    JwtModule.register({
      secret: `${process.env.jwt_secret}`,
      signOptions: { expiresIn: '1800s' },
    }),
  ],
  exports: [AuthService, BasePrisma, UserService, AppConfigService],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AttachUserMiddleware).forRoutes('*');
  }
}
