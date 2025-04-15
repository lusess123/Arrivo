import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';

import { ConfigModule } from '@nestjs/config';
import { MddModule } from './mdd/mdd.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env', // 指定.env文件路径，默认是根目录
      ignoreEnvFile: false, // 不忽略.env文件
      cache: false, // 禁用缓存，方便修改后实时生效
      isGlobal: true, // 全局注册，可以在其他模块直接使用
    }),
    ClsModule.forRoot({
      global: true, // Makes ClsService globally available
      middleware: { mount: true }, // Automatically mounts ClsMiddleware
    }),
    AuthModule,
    MddModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtService],
})
export class AppModule {}
