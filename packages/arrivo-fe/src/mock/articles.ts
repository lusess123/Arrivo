export interface Article {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleSentence {
  id: number;
  english: string;
  chinese: string;
  audioDuration: number; // in seconds
}

export interface ArticleDetail {
  id: number;
  title: string;
  sentences: ArticleSentence[];
}

// Mock data for article sentences
export const mockArticleDetails: Record<number, ArticleDetail> = {
  1: {
    id: 1,
    title: "Getting Started with English: A Beginner's Guide",
    sentences: [
      { id: 1, english: "Learning English can seem challenging at first, but with consistent practice, it becomes easier.", chinese: "学习英语一开始可能会很有挑战性，但通过持续练习，它会变得更容易。", audioDuration: 5.2 },
      { id: 2, english: "Start by focusing on basic vocabulary and simple sentence structures.", chinese: "从专注于基础词汇和简单句子结构开始。", audioDuration: 3.7 },
      { id: 3, english: "Remember that making mistakes is part of the learning process.", chinese: "记住，犯错误是学习过程的一部分。", audioDuration: 3.1 },
      { id: 4, english: "Try to practice a little bit every day rather than cramming once a week.", chinese: "尝试每天练习一点，而不是一周集中突击一次。", audioDuration: 4.3 },
      { id: 5, english: "Listening to English music and watching English movies with subtitles can also help improve your comprehension skills.", chinese: "听英语音乐和看带字幕的英语电影也可以帮助提高你的理解能力。", audioDuration: 6.5 }
    ]
  },
  2: {
    id: 2,
    title: "Common English Phrases for Everyday Conversations",
    sentences: [
      { id: 1, english: "Here are some useful phrases to help you navigate daily conversations.", chinese: "以下是一些帮助你应对日常对话的有用短语。", audioDuration: 4.1 },
      { id: 2, english: "'Nice to meet you' when meeting someone new.", chinese: "在遇到新朋友时说'很高兴认识你'。", audioDuration: 2.9 },
      { id: 3, english: "'How are you doing?' to ask about someone's wellbeing.", chinese: "'你好吗？'用来询问某人的健康状况。", audioDuration: 2.8 },
      { id: 4, english: "'I'm sorry, could you repeat that?' when you didn't understand something.", chinese: "'对不起，你能重复一遍吗？'当你没听懂某些内容时。", audioDuration: 3.6 },
      { id: 5, english: "'Excuse me' to politely interrupt or get attention.", chinese: "'打扰一下'用来礼貌地打断或引起注意。", audioDuration: 2.5 },
      { id: 6, english: "'Thank you very much' to express gratitude.", chinese: "'非常感谢'用来表达感激之情。", audioDuration: 2.4 },
      { id: 7, english: "Practice these phrases regularly to build confidence in your speaking abilities.", chinese: "定期练习这些短语，以建立你的口语能力自信。", audioDuration: 4.7 }
    ]
  }
};

export const mockArticles: Article[] = [
  {
    id: 1,
    title: "Getting Started with English: A Beginner's Guide",
    content: "Learning English can seem challenging at first, but with consistent practice, it becomes easier. Start by focusing on basic vocabulary and simple sentence structures. Remember that making mistakes is part of the learning process. Try to practice a little bit every day rather than cramming once a week. Listening to English music and watching English movies with subtitles can also help improve your comprehension skills.",
    createdAt: "2023-07-15T08:00:00Z",
    updatedAt: "2023-07-15T08:00:00Z"
  },
  {
    id: 2,
    title: "Common English Phrases for Everyday Conversations",
    content: "Here are some useful phrases to help you navigate daily conversations: 'Nice to meet you' when meeting someone new, 'How are you doing?' to ask about someone's wellbeing, 'I'm sorry, could you repeat that?' when you didn't understand something, 'Excuse me' to politely interrupt or get attention, 'Thank you very much' to express gratitude. Practice these phrases regularly to build confidence in your speaking abilities.",
    createdAt: "2023-08-02T10:30:00Z",
    updatedAt: "2023-08-02T10:30:00Z"
  },
  {
    id: 3,
    title: "Improving Your English Pronunciation",
    content: "Good pronunciation is key to being understood. Focus on problematic sounds that don't exist in your native language. Record yourself speaking and compare it to native speakers. Pay attention to word stress and sentence intonation, as they can change the meaning of what you're saying. Tongue twisters like 'She sells seashells by the seashore' are excellent practice exercises to improve your articulation.",
    createdAt: "2023-08-18T14:15:00Z",
    updatedAt: "2023-08-18T14:15:00Z"
  },
  {
    id: 4,
    title: "Essential Grammar: Understanding Verb Tenses",
    content: "English has 12 major verb tenses, which can be challenging for learners. Start by mastering the present simple (I walk), present continuous (I am walking), past simple (I walked), and future simple (I will walk). Once you're comfortable with these, move on to perfect tenses like present perfect (I have walked). Remember that regular practice with each tense in context is more valuable than memorizing rules.",
    createdAt: "2023-09-05T09:45:00Z",
    updatedAt: "2023-09-05T09:45:00Z"
  },
  {
    id: 5,
    title: "Building Your Vocabulary: Effective Strategies",
    content: "Expanding your vocabulary is crucial for fluency. Create flashcards with new words and review them regularly. Learn words in context rather than isolated lists. Group words by topics or themes for better retention. Use the new vocabulary in sentences to reinforce your learning. Reading books, articles, or blogs in English is also an excellent way to encounter new words in natural contexts.",
    createdAt: "2023-09-22T11:20:00Z",
    updatedAt: "2023-09-22T11:20:00Z"
  },
  {
    id: 6,
    title: "English for Travel: Navigate Your Next Adventure",
    content: "When traveling to English-speaking countries, these phrases can be helpful: 'Can you recommend a good restaurant nearby?', 'How do I get to the museum?', 'Is there public transportation available?', 'Do you have a room available for tonight?', 'How much does this cost?'. Practice asking for directions and understanding responses. Learning local slang or expressions can also enhance your travel experience.",
    createdAt: "2023-10-10T16:05:00Z",
    updatedAt: "2023-10-10T16:05:00Z"
  },
  {
    id: 7,
    title: "Writing Effective Emails in English",
    content: "Email communication requires a different set of skills. Start with appropriate greetings like 'Dear Mr./Ms.' for formal emails or 'Hi/Hello' for casual ones. Clearly state your purpose in the opening paragraph. Use short paragraphs and simple language. End with closing phrases such as 'Best regards,' 'Sincerely,' or 'Thanks,' depending on the formality. Always proofread before sending to catch any errors.",
    createdAt: "2023-10-28T13:40:00Z",
    updatedAt: "2023-10-28T13:40:00Z"
  },
  {
    id: 8,
    title: "English Idioms and Their Meanings",
    content: "Idioms add color to language but can be confusing for learners. Here are some common ones: 'Break a leg' means good luck, 'Cost an arm and a leg' means very expensive, 'Hit the books' means to study hard, 'Under the weather' means feeling sick. Try to learn idioms in context and practice using them in conversations to sound more natural and fluent.",
    createdAt: "2023-11-15T09:10:00Z",
    updatedAt: "2023-11-15T09:10:00Z"
  },
  {
    id: 9,
    title: "Preparing for English Proficiency Tests",
    content: "Tests like TOEFL, IELTS, or Cambridge English require specific preparation. Familiarize yourself with the test format and requirements. Practice all four skills: reading, writing, listening, and speaking. Use official practice materials and take timed mock tests. Develop strategies for each section, such as skimming for reading or note-taking for listening. Remember that consistent practice over time yields better results than last-minute cramming.",
    createdAt: "2023-12-03T15:30:00Z",
    updatedAt: "2023-12-03T15:30:00Z"
  },
  {
    id: 10,
    title: "English for Professional Development",
    content: "Strong English skills can enhance your career prospects. Focus on industry-specific vocabulary relevant to your field. Practice professional scenarios like job interviews, presentations, and meetings. Work on your written communication for reports and emails. Consider joining professional networks or forums where you can practice English in your professional context. Remember that clarity and precision are often more important than perfect grammar in professional settings.",
    createdAt: "2023-12-20T10:55:00Z",
    updatedAt: "2023-12-20T10:55:00Z"
  },
  {
    id: 11,
    title: "Common English Learning Mistakes to Avoid",
    content: "Many learners fall into similar traps. Don't rely solely on translation from your native language. Avoid focusing too much on grammar rules at the expense of actual communication. Don't be afraid to make mistakes – they're an essential part of learning. Avoid learning words in isolation without context. Don't neglect pronunciation or listening practice. Remember that consistency is more important than intensity in language learning.",
    createdAt: "2024-01-08T08:25:00Z",
    updatedAt: "2024-01-08T08:25:00Z"
  },
  {
    id: 12,
    title: "Using Technology to Improve Your English",
    content: "Technology offers numerous tools for language learners. Language learning apps like Duolingo or Babbel provide structured lessons. Podcasts designed for English learners offer listening practice. Browser extensions can help with vocabulary while you browse. Voice recognition software can help improve pronunciation. Online language exchange platforms connect you with native speakers for practice. Remember to balance technology use with traditional study methods for the best results.",
    createdAt: "2024-01-25T12:15:00Z",
    updatedAt: "2024-01-25T12:15:00Z"
  }
]; 

/**
 * Get article by ID
 * @param id Article ID (string or number)
 * @returns The article object or null if not found
 */
export const getArticleById = (id: string): ArticleDetail | null => {
  // First try to find in mockArticleDetails
  const numId = Number(id);
  const detailArticle = mockArticleDetails[numId];
  if (detailArticle) {
    return {
      id: detailArticle.id,
      title: detailArticle.title,
      // content: '', // Since ArticleDetail doesn't have content field
      // createdAt: new Date().toISOString(), // Mock data
      // updatedAt: new Date().toISOString() ,
      sentences: detailArticle.sentences,// Mock data,
    };
  }
  return null;
  
  // If not found in details, try in regular articles
  // const article = mockArticles.find(article => article.id.toString() === id);
  // return article || null;
}; 