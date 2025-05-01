import { Button, Card, Typography } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { AudioOutlined, SoundOutlined } from '@ant-design/icons';
const { Text } = Typography;

export default function Item({
  v,
  enanbleDelay,
  sound,
  times,
  delay,
  label,
  s,
  p,
  t,
  playing,
  onPlayEnd,
  index,
  rate,
}: any) {
  const audioRef = useRef<any>(null);
  const [playCount, setPlayCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaite, setIsWaite] = useState(false);
  const settimeRef = useRef<any>(null);
  const myRef = useRef<any>(null);
  const maxCount = times;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = `/api/text?s=${s}&v=${v}`; // 改变音频源
      audioRef.current.load(); // 重新载入音频文件
      audioRef.current.playbackRate = rate;
    }
  }, [s, v, rate]);

  // useEffect(() => {
  //   if (!audioRef.current.currentTime && playing) {
  //     audioRef.current.load();
  //     audioRef.current.playbackRate = rate;
  //     audioRef.current.addEventListener(
  //       'loadeddata',
  //       function () {
  //         console.log('Audio data loaded');
  //         // 你可以在这里执行任何需要的回调操作
  //         playAudio(); // 示例：自动播放新的音频
  //       },
  //       { once: true },
  //     ); // 使用 once: true 保证回调只执行一次
  //   } else {
  //     if (!playing) {
  //       audioRef.current.load();
  //       timeRef.current = 0;
  //       audioRef.current.playbackRate = rate;
  //       audioRef.current.pause();
  //       audioRef.current.currentTime = 0;
  //       setIsPlaying(false);
  //       setIsWaite(false);
  //       setPlayCount(0);
  //     }
  //   }
  // }, []);

  const timeRef = useRef<number>(0);
  const playAudio = () => {
    if (audioRef.current) {
      if (!sound) audioRef.current.volume = 0.0;
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
        audioRef.current.playbackRate = rate;
        audioRef.current.currentTime = 0;
        setIsWaite(false);
        audioRef.current.pause();
      } else {
        setPlayCount(playCount + 1);
        setIsPlaying(true);
        audioRef.current.playbackRate = rate;
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
          audioRef.current.playbackRate = rate;
        } else {
          timeRef.current = 0;
          setIsPlaying(false);
          setIsWaite(false);
          setPlayCount(0);
          audioRef.current.playbackRate = rate;
          if (onPlayEnd) onPlayEnd(index);
        }
      },
      (!enanbleDelay
        ? maxCount * time
        : maxCount
          ? maxCount * (time + ((delay || 0) * 1000 + 2000))
          : (delay || 0) * 1000 + 2000) / rate,
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

  return (
    <Card className="!text-xl" ref={myRef}>
      <audio
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        ref={audioRef}
      />
      <div
        onMouseUp={(e) => {
          if (!window || !window.getSelection) return;
          const selectedText = (window as any).getSelection().toString();
          if (selectedText) {
            // alert(selectedText)
            // 使用Web Speech API播放选中文本
            const utterance = new SpeechSynthesisUtterance(selectedText);
            speechSynthesis.speak(utterance);
          }
        }}
      >
        <Text className="break-words break-all !text-xl" strong={isPlaying}>
          {' '}
          <div
            dangerouslySetInnerHTML={{ __html: index + 1 + '.' + label }}
          ></div>
        </Text>
      </div>
      <div className="ml-4 break-words break-all !text-xl">
        {<div>[{p}]</div>}
      </div>
      <div className="ml-4 break-words break-all !text-xl">
        {<div> ({t})</div>}
      </div>
      <p className="ml-4 break-words break-all !text-xl">
        {' '}
        {isWaite ? '已经' : '正在'}
        {isPlaying ? `播放第${playCount}/${maxCount}次` : ''}{' '}
        {isPlaying &&
          (isWaite ? (
            <span>
              <AudioOutlined></AudioOutlined>跟读
            </span>
          ) : (
            <SoundOutlined />
          ))}{' '}
        {!!duration && duration + '秒'}
        <Button onClick={playAudio}>播放</Button>
        <Button
          onClick={() => {
            if (myRef.current) {
              myRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          置顶
        </Button>
      </p>
    </Card>
  );
}
