const list1 = [
  {
    sentence: 'So what are you gonna do? What do you want to know?',
    original: 'So what are you gonna do? What do you want to know?',
    translation: '所以你打算做什么？你想知道什么？',
    phonetic: '[soʊ wʌt ər ju ˈɡɒnə duː? wʌt də ju wɒnt tə noʊ?]',
  },
  {
    sentence: 'Yeah, I think we should talk about that.',
    original: 'Yeah, I think we should talk about that.',
    translation: '是的，我觉得我们应该谈谈这个。',
    phonetic: '[jæ aɪ θɪŋk wi ʃʊd tɔːk əˈbaʊt ðæt]',
  },
  {
    sentence: 'She took us to a place she knew we wouldn’t like.',
    original: 'She took us to a place she knew we wouldn’t like.',
    translation: '她带我们去了一个她知道我们不会喜欢的地方。',
    phonetic: '[ʃi tʊk əs tə ə pleɪs ʃi nuː wi ˈwʊdənt laɪk]',
  },
  {
    sentence: 'That doesn’t answer my question!',
    original: 'That doesn’t answer my question!',
    translation: '那并没有回答我的问题！',
    phonetic: '[ðæt ˈdʌznt ˈænsər maɪ ˈkwɛsʧən]',
  },
  {
    sentence: 'I wanted to do something special.',
    original: 'I wanted to do something special.',
    translation: '我想做一些特别的事情。',
    phonetic: '[aɪ ˈwɒntɪd tə du ˈsʌmθɪŋ ˈspɛʃəl]',
  },
  {
    sentence: 'But I think we should tell her.',
    original: 'But I think we should tell her.',
    translation: '但是我觉得我们应该告诉她。',
    phonetic: '[bʌt aɪ θɪŋk wi ʃʊd tɛl hɜːr]',
  },
  {
    sentence: 'Ho, oh, the baby’s awake. Do... do you want to meet him?',
    original: 'Ho, oh, the baby’s awake. Do... do you want to meet him?',
    translation: '哇哦，宝宝醒了。你想见他吗？',
    phonetic: '[hoʊ oʊ ðə ˈbeɪbiz əˈweɪk duː dʒu ˈwɒnt tə ˈmiːt hɪm]',
  },
  {
    sentence:
      'Robin Gallagher was right. The people she had met on Wisteria Lane had really looked at her.',
    original:
      'Robin Gallagher was right. The people she had met on Wisteria Lane had really looked at her.',
    translation: '罗宾·加拉格尔是对的。她在紫藤巷遇到的人确实看了她。',
    phonetic:
      '[ˈrɒbɪn ˈɡælɪɡər wəz raɪt ðə ˈpiːpl ʃi həd mɛt ɒn wɪˈstɪriə leɪn həd ˈrɪəli lʊkt æt hɜːr]',
  },
  {
    sentence: 'Are you angry with me? Why would you say that?',
    original: 'Are you angry with me? Why would you say that?',
    translation: '你在生我的气吗？为什么你会这么说？',
    phonetic: '[ɑːr ju ˈæŋɡri wɪð mi waɪ wʊd ju seɪ ðæt]',
  },
  {
    sentence:
      'Okay, okay, I’ll give you 20 bucks, if you get out of this car right now.',
    original:
      'Okay, okay, I’ll give you 20 bucks, if you get out of this car right now.',
    translation: '好吧，好吧，我给你20美元，如果你现在下车的话。',
    phonetic:
      '[ˈoʊkeɪ ˈoʊkeɪ aɪl ɡɪv ju ˈtwɛnti bʌks ɪf ju ɡɛt aʊt əv ðɪs kɑːr raɪt naʊ]',
  },
  {
    sentence: 'I’ve got to see you. I’ve got to get off this plane.',
    original: 'I’ve got to see you. I’ve got to get off this plane.',
    translation: '我得见你。我得下这架飞机。',
    phonetic: '[aɪv ˈɡɒt tə si ju aɪv ˈɡɒt tə ɡɛt ɒf ðɪs pleɪn]',
  },
  {
    sentence: 'And I have one idea, but it... it’s kind of crazy.',
    original: 'And I have one idea, but it... it’s kind of crazy.',
    translation: '我有一个想法，但是这有点疯狂。',
    phonetic: '[ænd aɪ həv wʌn aɪˈdɪə bʌt ɪt ɪts ˈkaɪnd əv ˈkreɪzi]',
  },
  {
    sentence: 'It’s weird, right?',
    original: 'It’s weird, right?',
    translation: '很奇怪吧？',
    phonetic: '[ɪts wɪrd raɪt]',
  },
  {
    sentence: 'A grown man in his 30s living with my mother.',
    original: 'A grown man in his 30s living with my mother.',
    translation: '一个30多岁的成年人还跟我妈住在一起。',
    phonetic: '[ə ɡroʊn mæn ɪn hɪz ˈθɜːrtiz ˈlɪvɪŋ wɪð maɪ ˈmʌðər]',
  },
  {
    sentence: 'That is weird. I thought he was, like, 45.',
    original: 'That is weird. I thought he was, like, 45.',
    translation: '那真的很奇怪。我以为他，大概，45岁了。',
    phonetic: '[ðæt ɪz wɪrd aɪ θɔːt hi wəz laɪk ˈfɔːrtiˈfaɪv]',
  },
  {
    sentence: 'Okay, look. You are right.',
    original: 'Okay, look. You are right.',
    translation: '好吧，你听我说。你是对的。',
    phonetic: '[ˈoʊkeɪ lʊk ju ɑːr raɪt]',
  },
  {
    sentence: 'I don’t have many friends.',
    original: 'I don’t have many friends.',
    translation: '我没有多少朋友。',
    phonetic: '[aɪ doʊnt həv ˈmɛni frɛndz]',
  },
  {
    sentence: 'So I was hoping to get to know Paige’s mom.',
    original: 'So I was hoping to get to know Paige’s mom.',
    translation: '所以我希望能认识佩吉的妈妈。',
    phonetic: '[soʊ aɪ wəz ˈhoʊpɪŋ tə ɡɛt tə noʊ ˈpeɪʤəz mɑːm]',
  },
  {
    sentence:
      'But if it makes you uncomfortable, then I will call her and cancel.',
    original:
      'But if it makes you uncomfortable, then I will call her and cancel.',
    translation: '但如果这让你觉得不舒服，我可以打电话给她取消。',
    phonetic:
      '[bʌt ɪf ɪt meɪks ju ʌnˈkʌmfərtəbl ðɛn aɪ wɪl kɔːl hɜːr ənd ˈkænsəl]',
  },
  {
    sentence: 'I’ll think about it.',
    original: 'I’ll think about it.',
    translation: '我会考虑的。',
    phonetic: '[aɪl ˈθɪŋk əˈbaʊt ɪt]',
  },
  {
    sentence: 'Guilt and jealousy in the same day, I slept hard that night.',
    original: 'Guilt and jealousy in the same day, I slept hard that night.',
    translation: '在同一天感受到愧疚和嫉妒，我那晚难以入睡。',
    phonetic: '[ɡɪlt ənd ˈʤɛləsi ɪn ðə seɪm deɪ aɪ slɛpt hɑːrd ðæt naɪt]',
  },
];
const list2 = [
  {
    sentence: 'Honey, just put on something else, and take down the makeup.',
    original: 'Honey, just put on something else, and take down the makeup.',
    translation: '宝贝，去找件别的衣服穿，再把妆化淡一点。',
    phonetic: '[ˈhʌni ʤʌst pʊt ɒn ˈsʌmθɪŋ ɛls ənd teɪk daʊn ðə ˈmeɪkʌp]',
  },
  {
    sentence: 'Why are you guys acting like this is my fault?',
    original: 'Why are you guys acting like this is my fault?',
    translation: '你们干嘛表现得好像这都是我的错一样？',
    phonetic: '[waɪ ɑːr ju ɡaɪz ˈæktɪŋ laɪk ðɪs ɪz maɪ fɔːlt]',
  },
  {
    sentence: 'Everybody was drinking, everybody ran.',
    original: 'Everybody was drinking, everybody ran.',
    translation: '每个人都喝酒了，也都逃跑了。',
    phonetic: '[ˈɛvrɪˌbɒdi wəz ˈdrɪŋkɪŋ ˈɛvrɪˌbɒdi ræn]',
  },
  {
    sentence: 'I just got caught.',
    original: 'I just got caught.',
    translation: '我只是被逮住了而已。',
    phonetic: '[aɪ ʤʌst ɡɒt kɔːt]',
  },
  {
    sentence: 'If anything, I’m the victim here.',
    original: 'If anything, I’m the victim here.',
    translation: '真要细究的话，我才是受害者。',
    phonetic: '[ɪf ˈɛnɪθɪŋ aɪm ðə ˈvɪktɪm hɪə]',
  },
  {
    sentence: 'What? Just stop -- just stop talking, Haley.',
    original: 'What? Just stop -- just stop talking, Haley.',
    translation: '什么？别，别说了，海莉。',
    phonetic: '[wʌt ʤʌst stɒp ʤʌst stɒp ˈtɔːkɪŋ ˈheɪli]',
  },
  {
    sentence: 'Hello, Janice, Hi. I’m so glad that you called.',
    original: 'Hello, Janice, Hi. I’m so glad that you called.',
    translation: '你好，珍妮斯。很高兴你打来。',
    phonetic: '[hɛˈloʊ ˈʤænɪs haɪ aɪm soʊ ɡlæd ðæt ju kɔːld]',
  },
  {
    sentence:
      'I know I’ve been acting really weird lately...and it’s just because I’m crazy about you...',
    original:
      'I know I’ve been acting really weird lately...and it’s just because I’m crazy about you...',
    translation: '我知道我最近表现很怪，那是因为我太爱你了。',
    phonetic:
      '[aɪ noʊ aɪv bɪn ˈæktɪŋ ˈrɪəli wɪrd ˈleɪtli ənd ɪts ʤʌst bɪˈkɔːz aɪm ˈkreɪzi əˈbaʊt ju]',
  },
  {
    sentence:
      'And I just got stupid and scared...and stupid a couple of more times.',
    original:
      'And I just got stupid and scared...and stupid a couple of more times.',
    translation: '我就变得很蠢，又很害怕，而且又蠢了好几次。',
    phonetic:
      '[ənd aɪ ʤʌst ɡɒt ˈstuːpɪd ənd skɛrd ənd ˈstuːpɪd ə ˈkʌpl əv mɔːr taɪmz]',
  },
];

const list3 = [
  {
    sentence: "I'm not just tired. I'm exhausted.",
    original: "I'm not just tired. I'm exhausted.",
    translation: '我不仅累，我是精疲力尽。',
    phonetic: '/aɪm nɒt ʤʌst ˈtaɪəd aɪm ɪɡˈzɔːstɪd/',
  },
  {
    sentence: 'Everything hurts.',
    original: 'Everything hurts.',
    translation: '全身上下都疼。',
    phonetic: '/ˈɛvrɪθɪŋ hɜːts/',
  },
  {
    sentence: "I get up in the morning to do this job I don't even like.",
    original: "I get up in the morning to do this job I don't even like.",
    translation: '我早上起来去做一份我根本不喜欢的工作。',
    phonetic: '/aɪ ɡɛt ʌp ɪn ðə ˈmɔːnɪŋ tə du ðɪs ʤɒb aɪ doʊnt ˈiːvən laɪk/',
  },
  {
    sentence:
      "And I'm doing it just for the money, and it's not even a lot of money.",
    original:
      "And I'm doing it just for the money, and it's not even a lot of money.",
    translation: '我工作只是为了钱，可钱还少得可怜。',
    phonetic:
      '/ænd aɪm ˈduːɪŋ ɪt ʤʌst fə ðə ˈmʌni ænd ɪts nɒt ˈiːvən ə lɒt əv ˈmʌni/',
  },
  {
    sentence:
      "I keep trying harder and harder, and it doesn't even make a difference.",
    original:
      "I keep trying harder and harder, and it doesn't even make a difference.",
    translation: '我每天都付出更多努力，但情况完全没有改变。',
    phonetic:
      '/aɪ kiːp ˈtraɪɪŋ ˈhɑːdər ænd ˈhɑːdər ænd ɪt ˈdʌznt ˈiːvən ˈmeɪk ə ˈdɪfərəns/',
  },
  {
    sentence:
      "So if you're going to yell at me or punish me, let's just get it over with.",
    original:
      "So if you're going to yell at me or punish me, let's just get it over with.",
    translation: '所以如果你要骂我或惩罚我，就赶紧完了事。',
    phonetic:
      '/soʊ ɪf jʊər ˈɡoʊɪŋ tə ˈjɛl ət miː ɔː ˈpʌnɪʃ miː lɛts ʤʌst ˈɡɛt ɪt ˈoʊvər wɪð/',
  },
  {
    sentence: 'Did I ever tell you I grew up poor?',
    original: 'Did I ever tell you I grew up poor?',
    translation: '我有没有告诉过你我成长于一个贫困的家庭？',
    phonetic: '/dɪd aɪ ˈɛvər ˈtɛl ju aɪ ˈɡruː ʌp pʊər/',
  },
  {
    sentence: 'My whole family was treated like trash.',
    original: 'My whole family was treated like trash.',
    translation: '我全家都被当垃圾一样对待。',
    phonetic: '/maɪ hoʊl ˈfæmɪli wəz ˈtriːtɪd laɪk træʃ/',
  },
  {
    sentence: 'So one day I asked God to make me rich and beautiful.',
    original: 'So one day I asked God to make me rich and beautiful.',
    translation: '所以有一天，我请求上帝让我变得富有和美丽。',
    phonetic: '/soʊ wʌn deɪ aɪ ˈæskt ɡɒd tə ˈmeɪk miː ˈrɪʧ ænd ˈbjuːtəfʊl/',
  },
  {
    sentence: 'So people would envy me.',
    original: 'So people would envy me.',
    translation: '这样人们就会羡慕我。',
    phonetic: '/soʊ ˈpiːpl wʊd ˈɛnviː miː/',
  },
];

const list4 = [
  {
    sentence:
      "Take One and pass it back. As you all know, this test'll count for 25% of your final grade.",
    original:
      "Take One and pass it back. As you all know, this test'll count for 25% of your final grade.",
    translation:
      '拿一个并传回。正如你们所知道的，这次测试将占你最终成绩的25%。',
    phonetic:
      '[teɪk wʌn ənd pæs ɪt bæk. æz ju ɔːl noʊ, ðɪs tɛstl kaʊnt fɔːr 25% əv jɔːr ˈfaɪnəl ɡreɪd]',
  },
  {
    sentence:
      'Be sure to show all your work. If you get stuck on a question, move on and come back to it at the end.',
    original:
      'Be sure to show all your work. If you get stuck on a question, move on and come back to it at the end.',
    translation:
      '确保展示你所有的工作。如果你在某个问题上卡住，继续前进，最后再回到它。',
    phonetic:
      '[biː ʃʊr tu ʃoʊ ɔːl jɔːr wɜːrk. ɪf ju ɡɛt stʌk ɑn ə ˈkwɛstʃən, muːv ɒn ənd kʌm bæk tu ɪt æt ðə ɛnd]',
  },
  {
    sentence:
      "And I shouldn't have to say this, but if there's any cheating, I will see it.",
    original:
      "And I shouldn't have to say this, but if there's any cheating, I will see it.",
    translation: '我不应该说这个，但如果有任何作弊，我会看到的。',
    phonetic:
      '[ænd aɪ ˈʃʊdnt hæv tu seɪ ðɪs, bʌt ɪf ðɛrz ˈɛni ˈʧiːtɪŋ, aɪ wɪl siː ɪt]',
  },
  {
    sentence:
      'I got eyes in the back of my head. I got more eyes than a potato.',
    original:
      'I got eyes in the back of my head. I got more eyes than a potato.',
    translation: '我的脑后有眼睛。我有比土豆更多的眼睛。',
    phonetic:
      '[aɪ ɡɒt aɪz ɪn ðə bæk əv maɪ hɛd. aɪ ɡɒt mɔːr aɪz ðæn ə pəˈteɪtoʊ]',
  },
  {
    sentence:
      "Ms. Ingram? —-Yeah. Sheldon. I'm done. What? I enjoyed it very much.",
    original:
      "Ms. Ingram? —-Yeah. Sheldon. I'm done. What? I enjoyed it very much.",
    translation: '英格拉姆女士？— 是的，谢尔顿。我完成了。什么？我非常享受。',
    phonetic:
      '[mɪz ˈɪŋɡræm? — jɛə, ˈʃɛldən. aɪm dʌn. wʌt? aɪ ɪnˈdʒɔɪd ɪt vɛri mʌʧ]',
  },
  {
    sentence:
      "I'll take another if you have one. No, I don't have another one. Just read ahead in the textbook.",
    original:
      "I'll take another if you have one. No, I don't have another one. Just read ahead in the textbook.",
    translation:
      '如果你有，我会再拿一个。不，我没有另一个。只需在课本中提前阅读。',
    phonetic:
      '[aɪl teɪk əˈnʌðər ɪf ju hæv wʌn. noʊ, aɪ doʊnt hæv əˈnʌðər wʌn. dʒʌst riːd əˈhɛd ɪn ðə ˈtɛkstbʊk]',
  },
  {
    sentence:
      "Oh, boy. Where's your dad? His car's gone. Uh, he and Renee went out to dinner.",
    original:
      "Oh, boy. Where's your dad? His car's gone. Uh, he and Renee went out to dinner.",
    translation:
      '哦，天哪。你爸爸在哪里？他的车不见了。嗯，他和雷妮出去吃晚饭了。',
    phonetic:
      '[oʊ, bɔɪ. wɛrz jɔːr dæd? hɪz kɑːrz ɡɒn. ʌ, hiː ənd rɪˈneɪ wɛnt aʊt tuː ˈdɪnər]',
  },
  {
    sentence:
      'He and Renee? Yeah, they went to that French restaurant dad likes. They said you could join them if you want.',
    original:
      'He and Renee? Yeah, they went to that French restaurant dad likes. They said you could join them if you want.',
    translation:
      '他和雷妮？是的，他们去了爸爸喜欢的那家法国餐厅。他们说你可以加入他们，如果你愿意的话。',
    phonetic:
      '[hiː ənd rɪˈneɪ? jɛə, ðeɪ wɛnt tuː ðæt frɛntʃ ˈrɛstərɒnt dæd laɪks. ðeɪ sɛd ju kʊd dʒɔɪn ðɛm ɪf ju wɑːnt]',
  },
];

export default list1.concat(list2).concat(list3).concat(list4);
