import M500 from './source/500m';

import bz from './source/bz';
import bz2 from './source/bz2';
import bz3 from './source/bz3';
import bz4 from './source/bz4';

import { sentences as egg } from './source/egg';
import genius from './source/genius.json';
import gukong from './source/gukong.json';
import isha from './source/isha.json';
import peter from './source/peter';
import silent from './source/silent';
import takeme from './source/takeme';
import tranpu from './source/tranpu';

export const SourceMap: Record<string, [string, any]> = {
  M500: ['500米', M500],
  bz: ['部长学英文 1', bz],
  bz2: ['部长学英文 2', bz2],
  bz3: ['部长学英文 3', bz3],
  bz4: ['部长学英文 4', bz4],
  egg: ['宇宙是一个蛋', egg],
  genius: ['关于天才的新见解', genius],
  gukong: ['黑神话悟空', gukong],
  isha: ['isha 冥想', isha],
  peter: ['彼得·潘', peter],
  silent: ['寂静之声', silent],
  takeme: ['吻别', takeme],
  tranpu: ['川普就职演讲', tranpu],
};
