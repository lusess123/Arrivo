import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [ArticleService],
  controllers: [ArticleController],
  imports: [AuthModule],
  exports: [ArticleService],
})
export class ArticleModule {}