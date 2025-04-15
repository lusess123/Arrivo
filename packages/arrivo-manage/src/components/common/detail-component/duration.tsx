import React from 'react';

export interface IDurationProps {
    value: any;
    onChange: (value: any) => void;
}



const DurationDetail = ({ value }: any) => {
  const units = [
    { label: '天', value: Math.floor(value / 86400) },
    { label: '小时', value: Math.floor((value % 86400) / 3600) },
    { label: '分钟', value: Math.floor((value % 3600) / 60) },
    { label: '秒', value: value % 60 }
  ];

  const timeString = units
    .filter(unit => unit.value > 0) // 仅保留非零单位
    .map(unit => `${unit.value}${unit.label}`) // 转换为字符串
    .join(' ') || '0秒'; // 所有单位为 0 时显示 "0秒"

  return <div>{timeString}</div>;
};

export default DurationDetail;