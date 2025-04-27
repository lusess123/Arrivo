import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { ArticleService, IArticlPost } from './article.service';

@Controller('article')
export class ArticleController {
  constructor(
    protected readonly auth: AuthService,
    private readonly articleService: ArticleService,
  ) {}

  @Post('createArticle')
  async createArticle(@Body() articlePost: IArticlPost) {
    return this.articleService.createArticle(articlePost);
  }
}
