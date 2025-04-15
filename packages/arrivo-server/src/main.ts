import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ResponseInterceptor } from './response.Interceptor';
import * as cookieParser from 'cookie-parser';
import { modelBootstrap } from './model';

const result = dotenv.config({ path: '.env' });

if (result.error) {
  throw result.error;
}

// 强制覆盖同步到 process.env
for (const [key, value] of Object.entries(result.parsed || {})) {
  process.env[key] = value;
}
// console.log(aa);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // rawBody: true,
    rawBody: true,
    bodyParser: true,
  });
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  console.log(process.env.WEB_CALL_URL);
  console.log(process.env.SELF_URL);
  modelBootstrap();
  app.use(cookieParser());
  app.enableShutdownHooks();
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(3000);
}
bootstrap();
