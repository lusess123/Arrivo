const a = [
  {
    sentence:
      'Thank you very much. Wow, well, I want to thank you all very much. This is great, these are our friends.',
    original:
      'Thank you very much. Wow, well, I want to thank you all very much. This is great, these are our friends.',
    translation:
      '非常感谢你们。哇，好吧，我想再次感谢大家。这太棒了，这些是我们的朋友。',
    phonetic:
      '[θæŋk ju ˈvɛri mʌʧ. waʊ, wɛl, aɪ wɒnt tu θæŋk ju ɔːl ˈvɛri mʌʧ. ðɪs ɪz ɡreɪt, ðiz ɑːr aʊər frɛndz.]',
  },
  {
    sentence:
      "We have thousands of friends on this incredible movement. This was a movement like nobody's ever seen before.",
    original:
      "We have thousands of friends on this incredible movement. This was a movement like nobody's ever seen before.",
    translation:
      '我们在这个不可思议的运动中有成千上万的朋友。这是一个前所未见的运动。',
    phonetic:
      '[wiː hæv ˈθaʊzəndz ɒv frɛndz ɒn ðɪs ɪnˈkrɛdɪbəl ˈmuːvmənt. ðɪs wɒz ə ˈmuːvmənt laɪk ˈnoʊbədi z ˈɛvər siːn bɪˈfɔːr.]',
  },
];

const b = [
  {
    sentence:
      "And frankly, this was, I believe, the greatest political movement of all time. There's never been anything like this in this country and maybe beyond.",
    original:
      "And frankly, this was, I believe, the greatest political movement of all time. There's never been anything like this in this country and maybe beyond.",
    translation:
      '而且，坦率的说，我相信这是有史以来最伟大的政治运动。在这个国家，甚至可能在更广范围内，从未有过这样的事情。',
    phonetic:
      '[ænd fræŋk, ðɪs wɒz, aɪ bɪˈliːv, ðə ˈgreɪtɪst pəˈlɪtɪkəl ˈmuːvmənt ɒv ɔːl taɪm. ðɛrz ˈnɛvər bɪn ˈɛnɪθɪŋ laɪk ðɪs ɪn ðɪs ˈkʌntri ænd ˈmeɪbi bɪˈjɒnd.]',
  },
  {
    sentence:
      "And now it's going to reach a new level of importance because we're going to help our country heal. We have a country that needs help and it needs help very badly.",
    original:
      "And now it's going to reach a new level of importance because we're going to help our country heal. We have a country that needs help and it needs help very badly.",
    translation:
      '现在它将达到一个新的重要阶段，因为我们将帮助国家复原。我们有一个需要帮助的国家，而且非常需要帮助。',
    phonetic:
      '[ænd naʊ ɪts ˈɡəʊɪŋ tuː riːʧ ə njuː ˈlɛvl ɒv ɪmˈpɔːrtəns bɪˈkɒz wɪər ˈɡəʊɪŋ tuː hɛlp aʊər ˈkʌntri hiːl. wiː hæv ə ˈkʌntri ðæt niːdz hɛlp ænd ɪt niːdz hɛlp ˈvɛri ˈbædli.]',
  },
  {
    sentence:
      "We're going to fix our borders. We're going to fix everything about our country.",
    original:
      "We're going to fix our borders. We're going to fix everything about our country.",
    translation: '我们将修复我们的边境。我们将修复国家的一切问题。',
    phonetic:
      '[wɪər ˈɡəʊɪŋ tuː fɪks aʊər ˈbɔːrdəz. wɪər ˈɡəʊɪŋ tuː fɪks ˈɛvrɪθɪŋ əˈbaʊt aʊər ˈkʌntri.]',
  },
];

const c = [
  {
    sentence:
      'And we made history for a reason tonight. The reason is going to be just that: we overcame obstacles that nobody thought possible.',
    original:
      'And we made history for a reason tonight. The reason is going to be just that: we overcame obstacles that nobody thought possible.',
    translation:
      '今晚我们创造了历史，这是有原因的。原因就是我们克服了大家认为不可能的障碍。',
    phonetic:
      '[ænd wiː meɪd ˈhɪstəri fɔːr ə ˈriːzən təˈnaɪt. ðə ˈriːzən ɪz ˈɡəʊɪŋ tuː biː dʒʌst ðæt: wiː ˌoʊvərˈkeɪm ˈɒbstəklz ðæt ˈnoʊbədi θɔːt ˈpɒsəbl.]',
  },
  {
    sentence:
      "It is now clear that we've achieved the most incredible political thing. Look what happened.",
    original:
      "It is now clear that we've achieved the most incredible political thing. Look what happened.",
    translation:
      '现在很清楚，我们已经取得了最不可思议的政治成就。看看发生了什么。',
    phonetic:
      '[ɪt ɪz naʊ klɪər ðæt wiːv əˈtʃiːvd ðə moʊst ɪnˈkrɛdəbl pəˈlɪtɪkəl θɪŋ. lʊk wʊt ˈhæpənd.]',
  },
  {
    sentence:
      "Is this crazy? But it's a political victory that our country has never seen before.",
    original:
      "Is this crazy? But it's a political victory that our country has never seen before.",
    translation: '这是不是很疯狂？但这是我们国家从未见过的政治胜利。',
    phonetic:
      '[ɪz ðɪs ˈkreɪzi? bʌt ɪts ə pəˈlɪtɪkəl ˈvɪktəri ðæt aʊər ˈkʌntri hæz ˈnɛvər siːn bɪˈfɔːr.]',
  },
];

const d = [
  {
    sentence:
      'I want to thank the American people for the extraordinary honor of being elected your 47th president and your 45th president.',
    original:
      'I want to thank the American people for the extraordinary honor of being elected your 47th president and your 45th president.',
    translation:
      '我想感谢美国人民赋予我这个非凡的荣誉，成为你们的第47任总统和第45任总统。',
    phonetic:
      '[aɪ wɒnt tuː θæŋk ði əˈmɛrɪkən ˈpiːpl fɔːr ði ɪkˈstrɔːrdəˌnɛri ˈɒnər əv ˈbiːɪŋ ɪˈlɛktɪd jɔːr ˈfɔːrti ˈsɛvənθ ˈprɛzɪdənt ænd jɔːr ˈfɔːrti ˈfɪfθ ˈprɛzɪdənt.]',
  },
  {
    sentence:
      'Every citizen, I will fight for you, for your family, and for your future every single day.',
    original:
      'Every citizen, I will fight for you, for your family, and for your future every single day.',
    translation:
      '每一位公民，我将为你们、为你们的家庭、为你们的未来而奋斗，每一天都如此。',
    phonetic:
      '[ˈɛvri ˈsɪtɪzən, aɪ wɪl faɪt fɔːr juː, fɔːr jɔːr ˈfæmɪli, ænd fɔːr jɔːr ˈfjuːtʃər ˈɛvri ˈsɪŋɡl deɪ.]',
  },
  {
    sentence:
      'With every breath in my body, I will not rest until we have delivered the strong, safe, and prosperous America that our children deserve and that you deserve.',
    original:
      'With every breath in my body, I will not rest until we have delivered the strong, safe, and prosperous America that our children deserve and that you deserve.',
    translation:
      '用我身体的每一口气，我不会停歇，直到我们实现一个强大、安全、繁荣的美国，这是我们的孩子和你们应得的。',
    phonetic:
      '[wɪð ˈɛvri brɛθ ɪn maɪ ˈbɒdi, aɪ wɪl nɒt rɛst ənˈtɪl wiː hæv dɪˈlɪvəd ðə strɒŋ, seɪf, ænd ˈprɒspərəs əˈmɛrɪkə ðæt aʊər ˈtʃɪldrən dɪˈzɜːv ænd ðæt juː dɪˈzɜːv.]',
  },
];

const e = [
  {
    sentence:
      "This will truly be the Golden Age of America. That's what we have to have.",
    original:
      "This will truly be the Golden Age of America. That's what we have to have.",
    translation: '这将是真正的美国黄金时代。这是我们必须拥有的。',
    phonetic:
      '[ðɪs wɪl ˈtruːli biː ðə ˈɡoʊldən eɪdʒ əv əˈmɛrɪkə. ðæts wʌt wiː hæv tuː hæv.]',
  },
  {
    sentence:
      'This is a magnificent victory for the American people that will allow us to make America great again.',
    original:
      'This is a magnificent victory for the American people that will allow us to make America great again.',
    translation: '这是美国人民的一个伟大胜利，将让我们再次使美国强大。',
    phonetic:
      '[ðɪs ɪz ə mæɡˈnɪfɪsənt ˈvɪktəri fɔːr ði əˈmɛrɪkən ˈpiːpl ðæt wɪl əˈlaʊ ʌs tuː meɪk əˈmɛrɪkə ɡreɪt əˈɡeɪn.]',
  },
  {
    sentence:
      'And in addition to having won the Battleground states of North Carolina, Georgia, Pennsylvania, and Wisconsin, we are now winning in Michigan, Arizona, Nevada, and Alaska.',
    original:
      'And in addition to having won the Battleground states of North Carolina, Georgia, Pennsylvania, and Wisconsin, we are now winning in Michigan, Arizona, Nevada, and Alaska.',
    translation:
      '除了赢得北卡罗来纳州、乔治亚州、宾夕法尼亚州和威斯康星州的战场州外，我们现在在密歇根州、亚利桑那州、内华达州和阿拉斯加州也正在获胜。',
    phonetic:
      '[ænd ɪn əˈdɪʃən tuː ˈhævɪŋ wʌn ðə ˈbætlɡraʊnd steɪts əv nɔːrθ ˌkærəˈlaɪnə, ˈdʒɔːrdʒə, ˌpɛnnsɪlˈveɪniə, ænd wɪsˈkɒnsɪn, wiː ɑːr naʊ ˈwɪnɪŋ ɪn ˈmɪʃɪɡən, ˌærɪˈzoʊnə, nəˈvædə, ænd əˈlæskə.]',
  },
];

const f = [
  {
    sentence:
      "Which would result in us carrying at least 315 electoral votes. But it's much easier doing what the networks did or whoever called it, because there was no other path to victory.",
    original:
      "Which would result in us carrying at least 315 electoral votes. But it's much easier doing what the networks did or whoever called it, because there was no other path to victory.",
    translation:
      '这将使我们至少赢得315张选举人票。但是，像网络或其他宣布的人所做的那样要简单得多，因为没有其他的胜利之路。',
    phonetic:
      '[wɪtʃ wʊd rɪˈzʌlt ɪn ʌs ˈkærɪɪŋ æt liːst 315 ɪˈlɛktərəl voʊts. bʌt ɪts mʌtʃ ˈiːziər ˈduːɪŋ wʌt ðə ˈnɛtˌwɜːrks dɪd ɔːr huːˈɛvər ˈkɔːld ɪt, bɪˈkɒz ðɛr wɒz noʊ ˈʌðər pæθ tuː ˈvɪktəri.]',
  },
  {
    sentence:
      'We also have won the popular vote, that was great. Proud of that.',
    original:
      'We also have won the popular vote, that was great. Proud of that.',
    translation: '我们也赢得了普选票，这太棒了。对此感到自豪。',
    phonetic:
      '[wiː ˈɔːlsoʊ hæv wʌn ðə ˈpɒpjʊlər voʊt, ðæt wɒz ɡreɪt. praʊd ʌv ðæt.]',
  },
  {
    sentence:
      "Thank you very much. Now winning the popular vote was very nice, very nice. I will tell you, it's a great feeling of love.",
    original:
      "Thank you very much. Now winning the popular vote was very nice, very nice. I will tell you, it's a great feeling of love.",
    translation:
      '非常感谢。赢得普选票真的非常好，非常好。我要告诉你们，这是一种伟大的爱的感觉。',
    phonetic:
      '[θæŋk ju ˈvɛri mʌʧ. naʊ ˈwɪnɪŋ ðə ˈpɒpjʊlər voʊt wɒz ˈvɛri naɪs, ˈvɛri naɪs. aɪ wɪl ˈtɛl juː, ɪts ə ɡreɪt ˈfiːlɪŋ ʌv lʌv.]',
  },
  {
    sentence:
      "We have a great feeling of love in this very large room with unbelievable people standing by my side. These people have been incredible, they've made the journey with me.",
    original:
      "We have a great feeling of love in this very large room with unbelievable people standing by my side. These people have been incredible, they've made the journey with me.",
    translation:
      '我们在这个大房间里充满了爱，身边站着令人难以置信的人们。这些人非常了不起，他们和我一起走过这段旅程。',
    phonetic:
      '[wiː hæv ə ɡreɪt ˈfiːlɪŋ ʌv lʌv ɪn ðɪs ˈvɛri lɑːrdʒ ruːm wɪð ˌʌnbɪˈliːvəbəl ˈpiːpl ˈstændɪŋ baɪ maɪ saɪd. ðiz ˈpiːpl hæv bɪn ɪnˈkrɛdəbəl, ðeɪv meɪd ðə ˈdʒɜːrni wɪð miː.]',
  },
  {
    sentence:
      "We're going to make you very happy, we're going to make you very proud of your vote. I hope that you're going to be looking back someday and say that was one of the truly important moments of my life.",
    original:
      "We're going to make you very happy, we're going to make you very proud of your vote. I hope that you're going to be looking back someday and say that was one of the truly important moments of my life.",
    translation:
      '我们会让你们非常高兴，我们会让你们为自己的投票感到非常自豪。我希望你们有一天会回首并说，那是我人生中真正重要的时刻之一。',
    phonetic:
      '[wɪər ˈɡoʊɪŋ tuː meɪk juː ˈvɛri ˈhæpi, wɪər ˈɡoʊɪŋ tuː meɪk juː ˈvɛri praʊd ʌv jɔːr voʊt. aɪ hoʊp ðæt jɔːr ˈɡoʊɪŋ tuː biː ˈlʊkɪŋ bæk ˈsʌmdeɪ ænd seɪ ðæt wɒz ˈwʌn ʌv ðə ˈtruːli ɪmˈpɔːrtənt ˈmoʊmənts ʌv maɪ laɪf.]',
  },
];
const g = [
  {
    sentence:
      'When I voted for this group of people beyond the president, this group of great people. America has given us an unprecedented and powerful mandate.',
    original:
      'When I voted for this group of people beyond the president, this group of great people. America has given us an unprecedented and powerful mandate.',
    translation:
      '当我为这个超越总统的群体投票时，这个伟大的人群。美国赋予了我们前所未有的强大使命。',
    phonetic:
      '[wɛn aɪ ˈvoʊtɪd fɔːr ðɪs ɡruːp ʌv ˈpiːpl bɪˈjɒnd ðə ˈprɛzɪdənt, ðɪs ɡruːp ʌv ɡreɪt ˈpiːpl. əˈmɛrɪkə hæz ˈɡɪvən ʌs ən ˌʌnˈprɛsɪdɛntɪd ænd ˈpaʊərfəl ˈmændeɪt.]',
  },
  {
    sentence:
      "We have taken back control of the Senate. Wow, that's good. And the Senate races in Montana, Nevada, Texas, Ohio, Michigan, Wisconsin, the great Commonwealth of Pennsylvania, we all won by the mega movement.",
    original:
      "We have taken back control of the Senate. Wow, that's good. And the Senate races in Montana, Nevada, Texas, Ohio, Michigan, Wisconsin, the great Commonwealth of Pennsylvania, we all won by the mega movement.",
    translation:
      '我们重新掌控了参议院。哇，太棒了。并且在蒙大拿州、内华达州、德克萨斯州、俄亥俄州、密歇根州、威斯康星州和伟大的宾夕法尼亚州的参议院选举中，我们都凭借这个强大的运动获胜。',
    phonetic:
      '[wiː hæv ˈteɪkən bæk kənˈtroʊl ʌv ðə ˈsɛnɪt. waʊ, ðæts ɡʊd. ænd ðə ˈsɛnɪt ˈreɪsɪz ɪn mɒnˈtænə, nəˈvædə, ˈtɛksəs, oʊˈhaɪoʊ, ˈmɪʃɪɡən, wɪsˈkɒnsɪn, ðə ˈɡreɪt ˈkɒmənˌwɛlθ ʌv ˌpɛnsɪlˈveɪniə, wiː ɔːl wʌn baɪ ðə ˈmɛɡə ˈmuːvmənt.]',
  },
  {
    sentence:
      'They helped so much, and those races, every one of them. We worked with the Senators; they were tough races.',
    original:
      'They helped so much, and those races, every one of them. We worked with the Senators; they were tough races.',
    translation:
      '他们帮助了太多，这些比赛中的每一场。我们与参议员们合作；这些都是艰难的竞选。',
    phonetic:
      '[ðeɪ ˈhɛlpt soʊ mʌʧ, ænd ðoʊz ˈreɪsɪz, ˈɛvri wʌn ʌv ðɛm. wiː ˈwɜːrkt wɪð ðə ˈsɛnɪtərz; ðeɪ wɜːr tʌf ˈreɪsɪz.]',
  },
  {
    sentence:
      'I mean, the number of victories in the Senate was absolutely incredible. And we did rallies; we did rallies with each one of them.',
    original:
      'I mean, the number of victories in the Senate was absolutely incredible. And we did rallies; we did rallies with each one of them.',
    translation:
      '我的意思是，参议院的胜利数量绝对令人难以置信。我们举行了集会，我们与每一个人举行了集会。',
    phonetic:
      '[aɪ miːn, ðə ˈnʌmbər ʌv ˈvɪktəriz ɪn ðə ˈsɛnɪt wɒz ˈæbsəluːtli ɪnˈkrɛdɪbəl. ænd wiː dɪd ˈræliz; wiː dɪd ˈræliz wɪð ˈiːtʃ wʌn ʌv ðɛm.]',
  },
];
const h = [
  {
    sentence:
      'Sometimes we did two or three for each one, and it was amazing to look at all of those victories. Nobody expected that, nobody.',
    original:
      'Sometimes we did two or three for each one, and it was amazing to look at all of those victories. Nobody expected that, nobody.',
    translation:
      '有时候，我们为每一个人举行了两到三场集会，看到这些胜利令人惊叹。没有人预料到这一点，没有人。',
    phonetic:
      '[ˈsʌmtaɪmz wiː dɪd tuː ɔːr θriː fɔːr ˈiːtʃ wʌn, ænd ɪt wɒz əˈmeɪzɪŋ tuː lʊk æt ɔːl ʌv ðoʊz ˈvɪktəriz. ˈnoʊbədi ɪkˈspɛktɪd ðæt, ˈnoʊbədi.]',
  },
  {
    sentence:
      'I just wanted to thank you very much for that. We have some great senators and some great new senators.',
    original:
      'I just wanted to thank you very much for that. We have some great senators and some great new senators.',
    translation:
      '我只是想非常感谢你们。我们有一些伟大的参议员和一些新的伟大参议员。',
    phonetic:
      '[aɪ dʒʌst ˈwɒntɪd tuː θæŋk ju ˈvɛri mʌʧ fɔːr ðæt. wiː hæv sʌm ˈɡreɪt ˈsɛnɪtərz ænd sʌm ˈɡreɪt njuː ˈsɛnɪtərz.]',
  },
  {
    sentence:
      "And it also looks like we'll be keeping control of the House of Representatives.",
    original:
      "And it also looks like we'll be keeping control of the House of Representatives.",
    translation: '看起来我们还将保持对众议院的控制权。',
    phonetic:
      '[ænd ɪt ˈɔːlsoʊ lʊks laɪk wiːl biː ˈkiːpɪŋ kənˈtroʊl ʌv ðə ˈhaʊs ʌv ˌrɛprɪˈzɛntəˌtɪvz.]',
  },
  {
    sentence:
      "I want to thank Mike Johnson. I think he's doing a terrific job, terrific job.",
    original:
      "I want to thank Mike Johnson. I think he's doing a terrific job, terrific job.",
    translation: '我要感谢迈克·约翰逊。我认为他做得非常出色，非常出色。',
    phonetic:
      '[aɪ wɒnt tuː θæŋk maɪk ˈdʒɒnsən. aɪ θɪŋk hiːz ˈduːɪŋ ə təˈrɪfɪk dʒɒb, təˈrɪfɪk dʒɒb.]',
  },
  {
    sentence: 'I want to also thank my beautiful wife, Melania, First Lady.',
    original: 'I want to also thank my beautiful wife, Melania, First Lady.',
    translation: '我也要感谢我的美丽妻子，第一夫人梅拉尼娅。',
    phonetic:
      '[aɪ wɒnt tuː ˈɔːlsoʊ θæŋk maɪ ˈbjuːtəfəl waɪf, məˈlæniə, fɜːrst ˈleɪdi.]',
  },
];

const i = [
  {
    sentence:
      "She's done a great job, works very hard, works very hard to help people.",
    original:
      "She's done a great job, works very hard, works very hard to help people.",
    translation: '她做得非常出色，非常努力地工作，非常努力地帮助别人。',
    phonetic:
      '[ʃiːz dʌn ə ɡreɪt dʒɒb, wɜːrks ˈvɛri hɑːrd, wɜːrks ˈvɛri hɑːrd tuː hɛlp ˈpiːpl.]',
  },
  {
    sentence:
      'So I just want to thank her. But I want to thank my whole family, my amazing children, and they are amazing children.',
    original:
      'So I just want to thank her. But I want to thank my whole family, my amazing children, and they are amazing children.',
    translation:
      '所以我只是想感谢她。但我也要感谢我的整个家庭，我的了不起的孩子们，他们真的是了不起的孩子。',
    phonetic:
      '[soʊ aɪ dʒʌst wɒnt tuː θæŋk hɜːr. bʌt aɪ wɒnt tuː θæŋk maɪ hoʊl ˈfæmɪli, maɪ əˈmeɪzɪŋ ˈtʃɪldrən, ænd ðeɪ ɑːr əˈmeɪzɪŋ ˈtʃɪldrən.]',
  },
  {
    sentence:
      "Now we all think our children are amazing, everybody here thinks their children are amazing, but that's a good thing when you think they are.",
    original:
      "Now we all think our children are amazing, everybody here thinks their children are amazing, but that's a good thing when you think they are.",
    translation:
      '现在我们都认为自己的孩子很了不起，这里每个人都觉得自己的孩子很了不起，但当你这样想时，这是一件好事。',
    phonetic:
      '[naʊ wiː ɔːl θɪŋk aʊər ˈtʃɪldrən ɑːr əˈmeɪzɪŋ, ˈɛvrɪbɒdi hɪər θɪŋks ðeɪr ˈtʃɪldrən ɑːr əˈmeɪzɪŋ, bʌt ðæts ə ɡʊd θɪŋ wɛn juː θɪŋk ðeɪ ɑːr.]',
  },
  {
    sentence:
      'But Don, Eric, Ivanka, Tiffany, Barron, Lara, Jared, Kimberly, Michael, thank you all. What a help, what a great family.',
    original:
      'But Don, Eric, Ivanka, Tiffany, Barron, Lara, Jared, Kimberly, Michael, thank you all. What a help, what a great family.',
    translation:
      '但唐、埃里克、伊万卡、蒂芙尼、巴伦、拉拉、贾里德、金伯利、迈克尔，谢谢你们所有人。多大的帮助，多么伟大的家庭。',
    phonetic:
      '[bʌt dɒn, ˈɛrɪk, ɪˈvɑːŋkə, ˈtɪfəni, ˈbærən, ˈlɑːrə, ˈdʒærəd, ˈkɪmbərli, ˈmaɪkəl, θæŋk juː ɔːl. wɒt ə hɛlp, wɒt ə ɡreɪt ˈfæmɪli.]',
  },
];

const j = [
  {
    sentence:
      "My father-in-law Victor is tremendous, and we miss very much Melania's mother Amalia. We miss Amalia, don't we? She would be very happy right now, standing on this stage.",
    original:
      "My father-in-law Victor is tremendous, and we miss very much Melania's mother Amalia. We miss Amalia, don't we? She would be very happy right now, standing on this stage.",
    translation:
      '我的岳父维克多非常出色，我们非常想念梅拉尼娅的母亲阿玛利亚。我们想念阿玛利亚，对吧？她现在站在这个舞台上会非常高兴。',
    phonetic:
      '[maɪ ˈfɑːðər ɪn lɔː ˈvɪktər ɪz trɪˈmɛndəs, ænd wiː mɪs ˈvɛri mʌtʃ məˈlæniə z ˈmʌðər əˈmɑːliə. wiː mɪs əˈmɑːliə, doʊnt wiː? ʃiː wʊd biː ˈvɛri ˈhæpi raɪt naʊ, ˈstændɪŋ ɒn ðɪs steɪdʒ.]',
  },
  {
    sentence:
      "She'd be so proud. She was a great woman, beautiful inside and out.",
    original:
      "She'd be so proud. She was a great woman, beautiful inside and out.",
    translation: '她会非常自豪。她是个伟大的女人，内外兼修的美丽。',
    phonetic:
      '[ʃiːd biː soʊ praʊd. ʃiː wɒz ə ɡreɪt ˈwʊmən, ˈbjuːtəfəl ˈɪnsaɪd ænd aʊt.]',
  },
  {
    sentence:
      'I want to be the first to congratulate our great, now I can say, Vice President-elect of the United States.',
    original:
      'I want to be the first to congratulate our great, now I can say, Vice President-elect of the United States.',
    translation:
      '我想成为第一个祝贺我们的伟大、现在可以称之为美国当选副总统的人。',
    phonetic:
      '[aɪ wɒnt tuː biː ðə ˈfɜːrst tuː kənˈɡrætjʊleɪt aʊər ɡreɪt, naʊ aɪ kæn seɪ, vaɪs ˈprɛzɪdənt ɪˈlɛkt ʌv ði juːˈnaɪtɪd steɪts.]',
  },
  {
    sentence: 'And his absolutely remarkable and beautiful wife.',
    original: 'And his absolutely remarkable and beautiful wife.',
    translation: '以及他那绝对非凡和美丽的妻子。',
    phonetic: '[ænd hɪz ˌæbsəˈluːtli rɪˈmɑːrkəbl ænd ˈbjuːtəfəl waɪf.]',
  },
];

const k = [
  {
    sentence:
      "He is a feisty guy, isn't he? You know, I've said, 'Go into the enemy camp,' and you know, the enemy camp is certain networks.",
    original:
      "He is a feisty guy, isn't he? You know, I've said, 'Go into the enemy camp,' and you know, the enemy camp is certain networks.",
    translation:
      '他是个充满活力的人，对吧？你知道，我曾说过，‘进入敌营’，而你知道，敌营就是某些网络。',
    phonetic:
      "[hiː ɪz ə ˈfaɪsti ɡaɪ, ˈɪznt hiː? juː noʊ, aɪv sɛd, 'ɡoʊ ˈɪntuː ði ˈɛnəmi kæmp,' ænd juː noʊ, ði ˈɛnəmi kæmp ɪz ˈsɜːrtən ˈnɛtwɜːrks.]",
  },
  {
    sentence:
      "A lot of people don't like it. 'Sir, do I have to do that?' He just goes, 'Okay, which one? CNN, MSDNC?'",
    original:
      "A lot of people don't like it. 'Sir, do I have to do that?' He just goes, 'Okay, which one? CNN, MSDNC?'",
    translation:
      '很多人不喜欢这样。‘先生，我必须这样做吗？’他只是说，‘好的，哪一个？CNN，MSDNC？’',
    phonetic:
      "[ə lɒt ʌv ˈpiːpl doʊnt laɪk ɪt. 'sɜːr, duː aɪ hæv tuː duː ðæt?' hiː dʒʌst ɡoʊz, 'ˈoʊkeɪ, wɪtʃ wʌn? ˈsiːɛnɛn, ɛmsˈdiːɛnsˈsiː?']",
  },
  {
    sentence:
      'He actually looks forward to it, and then he just goes in and absolutely obliterates them.',
    original:
      'He actually looks forward to it, and then he just goes in and absolutely obliterates them.',
    translation: '他实际上很期待这一刻，然后他就进去彻底打击他们。',
    phonetic:
      '[hiː ˈækʧuəli lʊks ˈfɔːrwərd tuː ɪt, ænd ðɛn hiː dʒʌst ɡoʊz ɪn ænd ˌæbsəˈluːtli əˈblɪtəreɪts ðɛm.]',
  },
];

export default a.concat(b, c, d, e, f, g);
