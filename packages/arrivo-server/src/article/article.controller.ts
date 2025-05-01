import { Body, Controller, Post, Get, Query } from '@nestjs/common';
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

  @Get('getArticleList')
  async getArticleList() {
    return this.articleService.getArticleList();
  }

  @Get('getArticleDetail')
  async getArticleDetail(@Query('id') id: string) {
    return this.articleService.getArticleDetail(id);
  }
}
