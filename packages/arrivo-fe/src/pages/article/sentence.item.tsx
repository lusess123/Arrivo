import React, { useEffect, useRef, useState } from 'react';
import styles from './index.module.less'
import { Button } from 'antd';
import { AudioOutlined, PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';

interface ISentenceItem {
    originalContent: string ,
    translatedContent: string,
    index : number,
    duration: number,
    id: string,
    times: number,
    // s: string,
    v: string,
    rate: number,
    delay: number,
    onPlayEnd: (index: number) => void,
    sound: boolean,
}

export default function SentenceItem(sentence: ISentenceItem) {

 
  const audioRef = useRef<any>(null);
  const [playCount, setPlayCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaite, setIsWaite] = useState(false);
  const settimeRef = useRef<any>(null);
  const myRef = useRef<any>(null);
  const maxCount = sentence.times;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = `/api/tts/audio?s=${sentence.originalContent}&v=${sentence.v}`; // 改变音频源
      audioRef.current.load(); // 重新载入音频文件
      audioRef.current.playbackRate = sentence.rate;
    }
  }, [sentence.translatedContent, sentence.v, sentence.rate]);

  useEffect(() => {
    if (!audioRef.current.currentTime && isPlaying) {
      audioRef.current.load();
      audioRef.current.playbackRate = sentence.rate;
      audioRef.current.addEventListener(
        'loadeddata',
        function () {
          console.log('Audio data loaded');
          // 你可以在这里执行任何需要的回调操作
          playAudio(); // 示例：自动播放新的音频
        },
        { once: true },
      ); // 使用 once: true 保证回调只执行一次
    } else {
      if (!isPlaying) {
        audioRef.current.load();
        timeRef.current = 0;
        audioRef.current.playbackRate = sentence.rate;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setIsWaite(false);
        setPlayCount(0);
      }
    }
  }, [isPlaying]);

  const timeRef = useRef<number>(0);
  const playAudio = () => {
    if (audioRef.current) {
      if (!sentence.sound) audioRef.current.volume = 0.0;
      if (myRef.current) {
        myRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      timeRef.current = new Date().getTime();
      if (isPlaying) {
        if (settimeRef.current) {
          clearTimeout(settimeRef.current);
        }
        setIsPlaying(false);
        setPlayCount(0);
        audioRef.current.playbackRate = sentence.rate;
        audioRef.current.currentTime = 0;
        setIsWaite(false);
        audioRef.current.pause();
      } else {
        setPlayCount(playCount + 1);
        setIsPlaying(true);
        audioRef.current.currentTime = playCount + 1;
        audioRef.current.playbackRate = sentence.rate;
        audioRef.current.play();
      }

      // playWithDelay(playCount);
    }
  };

  // const playWithDelay = (_playCount: number) => {
  //   if (audioRef.current && _playCount < 3) {
  //     audioRef.current.play();
  //     audioRef.current.addEventListener('ended', handleEnded);
  //   }
  // };

  function handleEnded() {
    const time = new Date().getTime() - timeRef.current;
    setDuration(time / 1000);
    // alert(playCount)
    // if (playCount < 3) {
    setIsWaite(true);
    settimeRef.current = setTimeout(
      () => {
        if (playCount < maxCount) {
          setIsWaite(false);
          timeRef.current = new Date().getTime();
          setPlayCount(playCount + 1);
          audioRef.current.play();
          audioRef.current.playbackRate = sentence.rate;
        } else {
          timeRef.current = 0;
          setIsPlaying(false);
          setIsWaite(false);
          setPlayCount(0);
          audioRef.current.playbackRate = sentence.rate;
          if (sentence.onPlayEnd) sentence.onPlayEnd(sentence.index);
        }
      },
      (!sentence.delay
        ? maxCount * time
        : maxCount
          ? maxCount * (time + ((sentence.delay || 0) * 1000 + 2000))
          : (sentence.delay || 0) * 1000 + 2000) / sentence.rate,
    );
    // }
    // else {
    //   timeRef.current = 0 ;
    //   setIsPlaying(false);
    //   setIsWaite(false)
    //   setPlayCount(0)
    //   if(onPlayEnd) onPlayEnd(index)

    // }
  }

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };



  return  <div key={sentence.id} className={styles.sentenceItem}>
    <audio
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        ref={audioRef}
      />
  <div className={styles.sentenceIndex}>{sentence.index+ 1}</div>
  <div className={styles.sentenceContent}>
    <p className={styles.englishText}>{sentence.originalContent}</p>
    <p className={styles.chineseText}>{sentence.translatedContent}</p>
  </div>
  <div className={styles.sentenceControls}>
    <Button 
      type="text" 
      icon={<PlayCircleOutlined />} 
      onClick={() => playAudio()}
      className={styles.sentencePlayButton}
    />
    {isWaite ? '已经' : '正在'}
        {isPlaying ? `播放第${playCount}/${maxCount}次` : ''}{' '}
        {isPlaying &&
          (isWaite ? (
            <span>
              <AudioOutlined></AudioOutlined>跟读
            </span>
          ) : (
            <SoundOutlined />
          ))}
        {!!duration && duration + '秒'}
  </div>
</div>
}
