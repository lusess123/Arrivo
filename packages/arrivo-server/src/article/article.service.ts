import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'arrivo-db';
import { AuthService } from 'src/auth/auth.service';
import { generateUniqueId } from 'src/auth/db';

export interface ISentence {
  sentence?: string;
  phonetic?: string;
  translation: string;
  original: string;
  delay?: number;
}

export interface IArticlPost {
  title: string;
  sentences: ISentence[];
}

@Injectable()
export class ArticleService {
  prismaClient: PrismaClient = new PrismaClient();
  constructor(protected readonly auth: AuthService) {}

  async createArticle(articlePost: IArticlPost) {
    const article = await this.prismaClient.articles.findFirst({
      where: {
        title: articlePost.title,
      },
    });
    const result: any[] = [];
    let articleId = '';
    const userId = this.auth.getUserId();
    if (article) {
      articleId = article.id;
      // throw new Error('Article already exists');
      // 删除句子
      const pDelete = this.prismaClient.sentences.deleteMany({
        where: {
          articleId: article.id,
        },
      });
      result.push(pDelete);
    } else {
      articleId = generateUniqueId();
      const pCreate = this.prismaClient.articles.create({
        data: {
          id: articleId,
          title: articlePost.title,
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
          userId,
          // tenant: this.auth.getUser()?.tenant,
          // tennantname: this.auth.getUser()?.tennantname,
          // teamId: this.auth.getUser()?.teamId,
        },
      });
      result.push(pCreate);
    }

    // 创建句子
    const pCreateSentences = this.prismaClient.sentences.createMany({
      data: articlePost.sentences.map((sentence) => ({
        articleId,
        content: sentence.original,
        originalContent: sentence.original,
        translatedContent: sentence.translation,
        id: generateUniqueId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      })),
    });
    result.push(pCreateSentences);
    const listResult = await this.prismaClient.$transaction(result);
    return listResult;
  }
}
