const list = [
  {
    sentence:
      'Hello darkness my old friend, I’ve come to talk with you again. Because a vision softly creeping left its seeds while I was sleeping.',
    original:
      'Hello darkness my old friend, I’ve come to talk with you again. Because a vision softly creeping left its seeds while I was sleeping.',
    translation:
      '你好，黑暗中我昔日的朋友，我又来和你谈一谈。因为有一个轻柔潜入的幻象，在我熟睡时播下了种子。',
    phonetic:
      '[ˈhɛloʊ ˈdɑːrknəs maɪ oʊld frɛnd, aɪv kʌm tu tɔːk wɪð ju əˈgɛn] [bɪˈkɔːz ə ˈvɪʒən ˈsɔːftli ˈkriːpɪŋ lɛft ɪts siːdz waɪl aɪ wəz ˈsliːpɪŋ]',
  },
  {
    sentence:
      'And the vision that was planted in my brain still remains within the sound of silence.',
    original:
      'And the vision that was planted in my brain still remains within the sound of silence.',
    translation: '而这个幻象被植入我的脑海，仍在寂静的声音中回荡。',
    phonetic:
      '[ænd ðə ˈvɪʒən ðæt wʌz ˈplæntɪd ɪn maɪ breɪn stɪl rɪˈmeɪnz wɪˈðɪn ðə saʊnd ʌv ˈsaɪləns]',
  },
  {
    sentence:
      'In restless dreams I walked alone, narrow streets of cobblestone. Neath the halo of a street lamp, I turned my collar to the cold and damp.',
    original:
      'In restless dreams I walked alone, narrow streets of cobblestone. Neath the halo of a street lamp, I turned my collar to the cold and damp.',
    translation:
      '在不安的梦境里我独自漫步，穿过狭窄的鹅卵石街道。在街灯的光环下，我竖起衣领抵御寒冷与潮湿。',
    phonetic:
      '[ɪn ˈrɛstləs driːmz aɪ wɔːkt əˈloʊn, ˈnæroʊ striːts ʌv ˈkɑːbəlstoʊn] [niːθ ðə ˈheɪloʊ ʌv ə striːt læmp, aɪ tɜːrnd maɪ ˈkɑːlər tu ðə koʊld ænd dæmp]',
  },
  {
    sentence:
      'When my eyes were stabbed by the flash of a neon light that split the night and touched the sound of silence. And in the naked light I saw ten thousand people maybe more.',
    original:
      'When my eyes were stabbed by the flash of a neon light that split the night and touched the sound of silence. And in the naked light I saw ten thousand people maybe more.',
    translation:
      '当我的双眼被霓虹灯的闪光刺痛，那灯光划破夜色，触及寂静之声。在那裸露的光线下，我看见成千上万的人，也许更多。',
    phonetic:
      '[wɛn maɪ aɪz wɜr stæbd baɪ ðə flæʃ ʌv ə ˈniːɒn laɪt ðæt splɪt ðə naɪt ænd tʌtʃt ðə saʊnd ʌv ˈsaɪləns] [ænd ɪn ðə ˈneɪkɪd laɪt aɪ sɔː tɛn ˈθaʊzənd ˈpiːpəl ˈmeɪbi mɔːr]',
  },
  {
    sentence:
      'People talking without speaking, people hearing without listening. People writing songs that voices never share.',
    original:
      'People talking without speaking, people hearing without listening. People writing songs that voices never share.',
    translation:
      '人们在说却没有言语，在听却没有真正倾听。人们写着歌曲，却从未让声音传递。',
    phonetic:
      '[ˈpiːpəl ˈtɔːkɪŋ wɪˈðaʊt ˈspiːkɪŋ, ˈpiːpəl ˈhɪrɪŋ wɪˈðaʊt ˈlɪsənɪŋ] [ˈpiːpəl ˈraɪtɪŋ sɔːŋz ðæt ˈvɔɪsɪz ˈnɛvər ʃɛr]',
  },
  {
    sentence:
      'No one dare disturb the sound of silence. Fools said I, you do not know silence like a cancer grows.',
    original:
      'No one dare disturb the sound of silence. Fools said I, you do not know silence like a cancer grows.',
    translation:
      '无人敢打扰这寂静之声。我说你们这些傻子啊，你们并不知道寂静就像癌症般蔓延。',
    phonetic:
      '[noʊ wʌn dɛr dɪˈstɜːrb ðə saʊnd ʌv ˈsaɪləns] [fuːlz sɛd aɪ, ju du nɒt noʊ ˈsaɪləns laɪk ə ˈkænsər ɡroʊz]',
  },
  {
    sentence:
      'Hear my words that I might teach you, take my arms that I might reach you. But my words like silent raindrops fell and echoed in the wells of silence.',
    original:
      'Hear my words that I might teach you, take my arms that I might reach you. But my words like silent raindrops fell and echoed in the wells of silence.',
    translation:
      '听我的话，也许我能教会你；牵起我的手，也许我能触及你。但我的话语就像无声的雨滴坠落，在寂静的深井中回响。',
    phonetic:
      '[hɪr maɪ wɜːrdz ðæt aɪ maɪt tiːtʃ ju, teɪk maɪ ɑːrmz ðæt aɪ maɪt riːtʃ ju] [bʌt maɪ wɜːrdz laɪk ˈsaɪlənt ˈreɪndrɒps fɛl ænd ˈɛkoʊd ɪn ðə wɛlz ʌv ˈsaɪləns]',
  },
  {
    sentence:
      'And the people bowed and prayed to the neon god they made. And the sign flashed out its warning in the words that it was forming.',
    original:
      'And the people bowed and prayed to the neon god they made. And the sign flashed out its warning in the words that it was forming.',
    translation:
      '人们鞠躬并向他们创造的霓虹神明祈祷。那个标志闪烁着警示，用它正在形成的话语。',
    phonetic:
      '[ænd ðə ˈpiːpəl baʊd ænd preɪd tu ðə ˈniːɒn ɡɑːd ðeɪ meɪd] [ænd ðə saɪn flæʃt aʊt ɪts ˈwɔːrnɪŋ ɪn ðə wɜːrdz ðæt ɪt wʌz ˈfɔːrmɪŋ]',
  },
  {
    sentence:
      'And the sign said the words of the prophets are written on the subway walls and tenement halls, and whispered in the sounds of silence.',
    original:
      'And the sign said the words of the prophets are written on the subway walls and tenement halls, and whispered in the sounds of silence.',
    translation:
      '那个标志说，先知的话语被写在地铁墙上与公寓走廊里，并在寂静之声中低声回荡。',
    phonetic:
      '[ænd ðə saɪn sɛd ðə wɜːrdz ʌv ðə ˈprɒfɪts ɑːr ˈrɪtən ɒn ðə ˈsʌbweɪ wɔːlz ænd ˈtɛnəmənt hɔːlz, ænd ˈwɪspərd ɪn ðə saʊndz ʌv ˈsaɪləns]',
  },
];

export default list;
