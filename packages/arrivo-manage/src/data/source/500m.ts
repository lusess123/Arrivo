const list = [
  {
    sentence:
      "If you miss the train I'm on, you will know that I am gone. You can hear the whistle blow a hundred miles, a hundred miles, a hundred miles",
    original:
      "If you miss the train I'm on, you will know that I am gone. You can hear the whistle blow a hundred miles, a hundred miles, a hundred miles",
    translation:
      '如果你错过了我那趟火车，你应明白我已离开。你可以听见一百英里外飘来的汽笛声，一百英里，一百英里',
    phonetic:
      '[ɪf ju mɪs ðə treɪn aɪm ɒn, ju wɪl noʊ ðæt aɪ æm ɡɔn. ju kæn hɪr ðə wɪsl bloʊ ə ˈhʌndrəd maɪlz, ə ˈhʌndrəd maɪlz, ə ˈhʌndrəd maɪlz]',
  },
  {
    sentence:
      "Lord I'm one, lord I'm two, lord I'm three, lord I'm four, lord I'm five hundred miles away from home. Away from home, Away from home, Not a shirt on my back, not a penny to my name",
    original:
      "Lord I'm one, lord I'm two, lord I'm three, lord I'm four, lord I'm five hundred miles away from home. Away from home, Away from home, Not a shirt on my back, not a penny to my name",
    translation:
      '上帝我已远离一百英里，两百英里，三百英里，四百英里，五百英里。离开家啊，离开家啊，我衣衫褴褛，一文不名',
    phonetic:
      '[lɔːrd aɪm wʌn, lɔːrd aɪm tuː, lɔːrd aɪm θriː, lɔːrd aɪm fɔːr, lɔːrd aɪm faɪv ˈhʌndrəd maɪlz əˈweɪ frəm hoʊm. əˈweɪ frəm hoʊm, əˈweɪ frəm hoʊm, nɒt ə ʃɜːrt ɒn maɪ bæk, nɒt ə ˈpɛni tuː maɪ neɪm]',
  },
  {
    sentence: "Lord I can't go back home this a-way, this a-way, this a-way",
    original: "Lord I can't go back home this a-way, this a-way, this a-way",
    translation: '上帝啊，我这么落魄怎么回家去，这般窘迫，这般潦倒',
    phonetic: '[lɔːrd aɪ kænt ɡoʊ bæk hoʊm ðɪs ə-weɪ, ðɪs ə-weɪ, ðɪs ə-weɪ]',
  },
];

const list2 = [
  {
    sentence:
      "How many roads must a man walk down before you can call him a man? How many seas must a white dove sail before she sleeps in the sand? Yes, how many times must the cannon balls fly before they're forever banned?",
    original:
      "How many roads must a man walk down before you can call him a man? How many seas must a white dove sail before she sleeps in the sand? Yes, how many times must the cannon balls fly before they're forever banned?",
    translation:
      '一个人要走多少条路才能被称作‘人’？一只白鸽要飞过多少海洋才能在沙滩上栖息？是的，大炮的炮弹要飞多少次才能永远被禁止？',
    phonetic:
      '[haʊ ˈmɛni roʊdz mʌst ə mæn wɔːk daʊn bɪˈfɔːr ju kæn kɔːl hɪm ə mæn? haʊ ˈmɛni siːz mʌst ə waɪt dʌv seɪl bɪˈfɔːr ʃi sliːps ɪn ðə sænd? jɛs, haʊ ˈmɛni taɪmz mʌst ðə ˈkænən bɔːlz flaɪ bɪˈfɔːr ðeər fɔːˈɛvər bænd?]',
  },
  {
    sentence:
      "The answer my friend is blowin' in the wind, the answer is blowin' in the wind. Yes, how many years can a mountain exist before it's washed to the sea? Yes, how many years can some people exist before they're allowed to be free?",
    original:
      "The answer my friend is blowin' in the wind, the answer is blowin' in the wind. Yes, how many years can a mountain exist before it's washed to the sea? Yes, how many years can some people exist before they're allowed to be free?",
    translation:
      '答案，我的朋友，就在风中飘荡，答案就在风中飘荡。是的，一座山能存在多少年才会被冲刷到海里？是的，一些人能存在多少年才能获得自由？',
    phonetic:
      '[ði ˈænsər maɪ frɛnd ɪz ˈbloʊɪn ɪn ðə wɪnd, ði ˈænsər ɪz ˈbloʊɪn ɪn ðə wɪnd. jɛs, haʊ ˈmɛni jɪərz kæn ə ˈmaʊntən ɪɡˈzɪst bɪˈfɔːr ɪts wɒʃt tə ðə siː? jɛs, haʊ ˈmɛni jɪərz kæn sʌm ˈpiːpl ɪɡˈzɪst bɪˈfɔːr ðeər əˈlaʊd tə biː friː?]',
  },
  {
    sentence:
      "Yes, how many times can a man turn his head pretending he just doesn't see? Yes, how many times must a man look up before he can really see the sky? Yes, how many ears must one man have before he can hear people cry?",
    original:
      "Yes, how many times can a man turn his head pretending he just doesn't see? Yes, how many times must a man look up before he can really see the sky? Yes, how many ears must one man have before he can hear people cry?",
    translation:
      '是的，一个人能转多少次头假装看不见？是的，一个人要抬多少次头才能真正看到天空？是的，一个人要有多少只耳朵才能听见人们的哭声？',
    phonetic:
      '[jɛs, haʊ ˈmɛni taɪmz kæn ə mæn tɜːrn hɪz hɛd prɪˈtɛndɪŋ hi dʒʌst ˈdʌznt siː? jɛs, haʊ ˈmɛni taɪmz mʌst ə mæn lʊk ʌp bɪˈfɔːr hi kæn ˈrɪəli siː ðə skaɪ? jɛs, haʊ ˈmɛni ɪərz mʌst wʌn mæn hæv bɪˈfɔːr hi kæn hɪr ˈpiːpl kraɪ?]',
  },
  {
    sentence:
      "Yes, how many deaths will it take till he knows that too many people have died? The answer my friend is blowin' in the wind, the answer is blowin' in the wind.",
    original:
      "Yes, how many deaths will it take till he knows that too many people have died? The answer my friend is blowin' in the wind, the answer is blowin' in the wind.",
    translation:
      '是的，需要多少次死亡他才能明白已经死了太多人？答案，我的朋友，就在风中飘荡，答案就在风中飘荡。',
    phonetic:
      '[jɛs, haʊ ˈmɛni dɛθs wɪl ɪt teɪk tɪl hi noʊz ðæt tuː ˈmɛni ˈpiːpl hæv daɪd? ði ˈænsər maɪ frɛnd ɪz ˈbloʊɪn ɪn ðə wɪnd, ði ˈænsər ɪz ˈbloʊɪn ɪn ðə wɪnd.]',
  },
];

export default list.concat(list2);
