export interface Sentence {
  id: string;
  articleId: string;
  index: number;
  english: string;
  chinese: string;
  duration: number;
}

const mockSentences: Record<string, Sentence[]> = {
  '1': [
    {
      id: 'sentence-1-1',
      articleId: 'article-1',
      index: 1,
      english: 'There was once a little house on a hill.',
      chinese: '从前，山上有一座小房子。',
      duration: 3.2
    },
    {
      id: 'sentence-1-2',
      articleId: 'article-1',
      index: 2,
      english: 'In the house lived a family of five.',
      chinese: '房子里住着一家五口人。',
      duration: 2.8
    },
    {
      id: 'sentence-1-3',
      articleId: 'article-1',
      index: 3,
      english: 'Every morning, they would wake up to the sound of birds singing.',
      chinese: '每天早晨，他们都会在鸟儿的歌声中醒来。',
      duration: 4.5
    },
    {
      id: 'sentence-1-4',
      articleId: 'article-1',
      index: 4,
      english: 'The children would run outside to play in the garden.',
      chinese: '孩子们会跑到外面在花园里玩耍。',
      duration: 3.7
    },
    {
      id: 'sentence-1-5',
      articleId: 'article-1',
      index: 5,
      english: 'They lived a simple but happy life together.',
      chinese: '他们过着简单而幸福的生活。',
      duration: 3.1
    }
  ],
  'article-2': [
    {
      id: 'sentence-2-1',
      articleId: 'article-2',
      index: 1,
      english: 'The old bookstore stood at the corner of Main Street for over a century.',
      chinese: '这家老书店在大街的拐角处已经存在了一个多世纪。',
      duration: 5.3
    },
    {
      id: 'sentence-2-2',
      articleId: 'article-2',
      index: 2,
      english: 'Its shelves were filled with stories from around the world.',
      chinese: '它的书架上摆满了来自世界各地的故事。',
      duration: 4.1
    },
    {
      id: 'sentence-2-3',
      articleId: 'article-2',
      index: 3,
      english: 'People of all ages would come to discover new adventures within its pages.',
      chinese: '各个年龄段的人都会来这里在书页中发现新的冒险。',
      duration: 5.8
    },
    {
      id: 'sentence-2-4',
      articleId: 'article-2',
      index: 4,
      english: 'The owner, Mr. Johnson, knew every book by heart.',
      chinese: '店主约翰逊先生对每一本书都了如指掌。',
      duration: 3.9
    },
    {
      id: 'sentence-2-5',
      articleId: 'article-2',
      index: 5,
      english: 'He believed that books were the greatest treasure one could possess.',
      chinese: '他相信书籍是一个人能拥有的最大财富。',
      duration: 4.4
    }
  ],
  'article-3': [
    {
      id: 'sentence-3-1',
      articleId: 'article-3',
      index: 1,
      english: 'The ancient forest was shrouded in morning mist.',
      chinese: '这片古老的森林笼罩在晨雾中。',
      duration: 3.6
    },
    {
      id: 'sentence-3-2',
      articleId: 'article-3',
      index: 2,
      english: 'Tall trees reached up toward the sky like silent guardians.',
      chinese: '高大的树木像无声的守护者一样伸向天空。',
      duration: 4.2
    },
    {
      id: 'sentence-3-3',
      articleId: 'article-3',
      index: 3,
      english: 'A small stream wound its way through the undergrowth.',
      chinese: '一条小溪在灌木丛中蜿蜒流淌。',
      duration: 3.5
    },
    {
      id: 'sentence-3-4',
      articleId: 'article-3',
      index: 4,
      english: 'Animals of all kinds made their homes among the branches and roots.',
      chinese: '各种动物在树枝和树根之间安家。',
      duration: 4.7
    },
    {
      id: 'sentence-3-5',
      articleId: 'article-3',
      index: 5,
      english: 'The forest had stood for thousands of years and would stand for thousands more.',
      chinese: '这片森林已经存在了数千年，还将继续存在数千年。',
      duration: 5.5
    }
  ]
};

export const getSentencesByArticleId = (articleId: string): Sentence[] => {
  return mockSentences[articleId] || [];
};

export const getSentenceById = (sentenceId: string): Sentence | undefined => {
  for (const articleSentences of Object.values(mockSentences)) {
    const sentence = articleSentences.find(s => s.id === sentenceId);
    if (sentence) {
      return sentence;
    }
  }
  return undefined;
}; 