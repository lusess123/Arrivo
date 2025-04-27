const list1 = [
  {
    sentence:
      "I guess Peter Pan was right, growing up's a waste of time. So I think I'll fly away, set a course for brighter days, find the second star, I'm soaring, then straight on to the morning, I know that I'll be fine, ‘Cus I know Peter Pan was right.",
    original:
      "I guess Peter Pan was right, growing up's a waste of time. So I think I'll fly away, set a course for brighter days, find the second star, I'm soaring, then straight on to the morning, I know that I'll be fine, ‘Cus I know Peter Pan was right.",
    translation:
      '我觉得彼得·潘是对的，长大成人就是浪费时间，所以我觉得我会远走高飞，确定路线，奔向美好的日子，寻找第二颗星，我翱翔天际，然后直飞向清晨，我知道我会安然无恙，因为我知道彼得·潘没有错。',
    phonetic:
      '[aɪ ɡɛs pɪˈtər pæn wɒz raɪt, ˈɡroʊɪŋ ʌpːz ə weɪst əv taɪm, soʊ aɪ θɪŋk aɪl flaɪ əˈweɪ, sɛt ə kɔ˂rs fɔ˂r ˈbraɪtər deɪz, faɪnd ðə sɛkənd stɑ˂r, aɪm ˈsɔ˂rɪŋ, ðɛn streɪt ɑ˂n tu˂ ðə ˈmɔ˂rnɪŋ, aɪ noʊ ðæt aɪl bi˂ faɪn, kəz aɪ noʂ ˈpɪtər pæn wɒz raɪt]',
  },
  {
    sentence:
      "Just a lost boy in a small town, I'm the same kid but I'm grown now, try to make it out, but I don't know how. Wish that I was young, what have I become. Now it's late night and I'm at home, so I make friends with my shadow.",
    original:
      "Just a lost boy in a small town, I'm the same kid but I'm grown now, try to make it out, but I don't know how. Wish that I was young, what have I become. Now it's late night and I'm at home, so I make friends with my shadow.",
    translation:
      '只是个出生在小镇的迷茫男孩，我还是那个孩子，但我已经长大了。想要取得成功，但我不知道怎么做。希望我依然年轻，我变成了什么样子。现在是深夜，我在家，所以我和影子成了朋友。',
    phonetic:
      '[ʤʌst ə lɔ˂st bɔɪ ɪn ə smɔ˂l taʊn, aɪm ðə seɪm kɪd bʌt aɪm ɡroʂn naʂ, traɪ tu˂ meɪk ɪt aʊt, bʌt aɪ doʂnt noʂ haʊ, wɪʃ ðæt aɪ wʌz jʌŋ, wʌt hæv aɪ bɪˈkʌm, naʂ ɪts leɪt naɪt ənd aɪm ət hoʂm, soʂ aɪ meɪk frɛndz wɪð maɪ ˈʃædoʂ]',
  },
  {
    sentence:
      "And I play him all my sad, sad songs, and we don't talk. Fairy tales are not the truth, what am I supposed to do. Days feel like a blur now, still feel eighteen but I'm burnt out. So I daydream of what I could be, if I turned back time.",
    original:
      "And I play him all my sad, sad songs, and we don't talk. Fairy tales are not the truth, what am I supposed to do. Days feel like a blur now, still feel eighteen but I'm burnt out. So I daydream of what I could be, if I turned back time.",
    translation:
      '我为他播放所有我悲伤的歌曲，我们却不说话。童话故事不是真的，我应该怎么办。日子现在感觉模糊不清，感觉还是十八岁，但我已精疲力尽。 所以我白日做梦，如果我能让时间倒流，我会是什么样子。',
    phonetic:
      '[ænd aɪ pleɪ hɪm ɔ˂l maɪ sæd, sæd sɔ˂ŋz, ənd wi doʂnt tɔ˂k, ˈfɛəri teɪlz ɑ˂r nɑ˂t ðə tru˂θ, wʌt æm aɪ səˈpoʂzd tu˂ du˂, deɪz fi˂l laɪk ə blɜ˂r naʂ, stɪl fi˂l ˌɛɪˈti˂n bʌt aɪm bɜ˂nt aʊt, soʂ aɪ ˈdeɪdri˂m əv wʌt aɪ kʊd bi˂, ɪf aɪ tɜ˂rnd bæk taɪm]',
  },
  {
    sentence:
      "A couple kids, one girl and a sailor, met a boy in green. I thought it'd be me, but I guess that dream wasn't meant to be like. I guess Peter Pan was right, and I don't care if I never land. Cus' the distant sky's always better than my life right now.",
    original:
      "A couple kids, one girl and a sailor, met a boy in green. I thought it'd be me, but I guess that dream wasn't meant to be like. I guess Peter Pan was right, and I don't care if I never land. Cus' the distant sky's always better than my life right now.",
    translation:
      '几个孩子，一个女孩和一个水手，遇到了一个穿绿色衣服的男孩。我以为会是我，但我觉得那个梦并不是注定要这样的。我觉得彼得·潘是对的，我不在乎我是否永远无法着陆。因为遥远的天空总是比我现在的生活在得好。',
    phonetic:
      '[ə ˈkʌpl kɪdz, wʌn ɡɜ˂rl ənd ə ˈseɪlər, mɛt ə bɔɪ ɪn ɡri˂n, aɪ θɔ˂t ɪtdə bi˂ mi˂, bʌt aɪ ɡɛs ðæt dri˂m ˈwɒzənt mɛnt tu˂ bi˂ laɪk, aɪ ɡɛs pɪˈtər pæn wɒz raɪt, ənd aɪ doʂnt kɛər ɪf aɪ ˈnɛvər lænd, kəz ðə ˈdɪstənt skaɪz ˈɔ˂lweɪz ˈbɛtər ðən maɪ laɪf raɪt naʂ]',
  },
  {
    sentence: 'So for one last time, I guess Peter Pan was right.',
    original: 'So for one last time, I guess Peter Pan was right.',
    translation: '所以最后再说一遍，我觉得彼得·潘是对的。',
    phonetic: '[soʂ fɔ˂r wʌn lɑ˂st taɪm, aɪ ɡɛs pɪˈtər pæn wɒz raɪt]',
  },
];

export default list1;
