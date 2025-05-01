/*
 * @Author: AEJays
 * @Date: 2024-06-26 18:03:13
 * @LastEditors: AEJays
 * @LastEditTime: 2024-06-27 22:10:48
 * @FilePath: /script/edge-tts/scripts/lib/generate.ts
 * @Email: aedgejay@qq.com
 */

import { exec } from 'child_process';
import 'colors';
// import path from 'path';

const _TTS_COMMAND_ = 'edge-tts';

interface VoicePackage {
  name: string;
  gender: string;
}

const pythonExecutable = process.env.PYTHON_ENV || '';

/**
 * @name voicesENV PYTHON_ENV='cd /app &&  source ./venv/bin/activate &&'
 * @description 获取语音包列表
 * @param {string} lang
 * @returns {Promise<VoicePackage[]>} 返回语音包数组对象
 */
export function voices(lang?: string): Promise<VoicePackage[]> {
  return new Promise((resolve, reject) => {
    exec(
      ` ${pythonExecutable}  ${_TTS_COMMAND_} -l`,
      (error, stdout, stderr) => {
        if (error) {
          reject(stderr);
          return;
        }
        console.log(stdout);
        stdout = stdout
          .replaceAll('Name:', '')
          .replaceAll('\nGender:', '\t')
          // .replaceAll("Female", '女声')
          // .replaceAll("Male", '男声')
          .replaceAll('\n\n', '\n');

        const lines = stdout.split('\n').filter((line) => line.trim() !== '');
        const jsonResult: VoicePackage[] = lines.map((line) => {
          const [name, gender] = line.split('\t').map((item) => item.trim());
          return { name, gender };
        });

        if (!lang) {
          resolve(jsonResult);
        } else {
          const filtered = jsonResult.filter((item) =>
            item.name.includes(`${lang}-`),
          );
          resolve(filtered);
        }
      },
    );
  });
}

/**
 * @name toVoice
 * @description 通过文本生成语音
 * @param {string} text 需要生成的文本
 * @param {string} filePath 为生成的文本路径
 * @param {Object} params 各种选择
 * @param {string} params.voice 语音包
 * @param {number} params.rate 语音速率快或慢
 * @param {string} params.volume 声音大小
 * @param {string} params.pitch 声调、频率大小
 */
interface VoiceParams {
  voice?: string;
  rate?: number;
  volume?: number;
  pitch?: number;
}

function escapeDoubleQuotes(str: string) {
  return str.replace(/"/g, '\\"');
}

export function toVoice(
  text: string,
  filePath: string = './output.mp4',
  params: VoiceParams = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!text) {
      reject(new Error('开发错误：没有 text 变量，请正确配置'));
      return;
    }
    if (!filePath) {
      console.warn('开发警告：没有 filePath 变量，已默认设置为 output.mp4');
    }

    let execCommand = ` ${pythonExecutable} ${_TTS_COMMAND_} --text "${escapeDoubleQuotes(text)}" `;
    if (filePath) execCommand += ` --write-media "${filePath}" `;
    if (params.voice) execCommand += ` -v ${params.voice}`;
    if (params.rate)
      execCommand += ` --rate ${params.rate > 0 ? '+' + params.rate : params.rate}%`;
    if (params.volume)
      execCommand += ` --volume ${params.volume > 0 ? '+' + params.volume : params.volume}%`;
    if (params.pitch)
      execCommand += ` --pitch ${params.pitch > 0 ? '+' + params.pitch : params.pitch}Hz`;

    console.log(execCommand);
    exec(execCommand, (error, stdout, stderr) => {
      if (!error) {
        console.log(`生成成功，路径在 ${filePath}`);
        console.log(stdout);
        resolve();
      } else {
        console.log(stderr, error);
        reject(error);
      }
    });
  });
}

// export {
//     voices,
//     toVoice
// }
