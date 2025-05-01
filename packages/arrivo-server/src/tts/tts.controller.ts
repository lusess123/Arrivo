import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { TTSService } from './tts.service';
import * as fs from 'fs';
import { console } from 'inspector';
interface VoicePackage {
  name: string;
  gender: string;
}

@Controller('tts')
export class TTSController {
  constructor(
    protected readonly auth: AuthService,
    private readonly ttsService: TTSService,
  ) {}

  @Get('voices')
  async getVoices(@Query('lang') lang?: string): Promise<VoicePackage[]> {
    const voicesList = await this.ttsService.getVoices(lang);
    return voicesList;
  }

  @Get('mp3')
  getMp3(@Res() res: Response) {
    // 获取文件路径（假设 MP3 文件存放在 "audio" 目录下）
    const filePath =
      '/Users/zhengyukun/Documents/github/Arrivo/packages/arrivo-server/audio_cache/en-CA-ClaraNeural/770e607624d689265ca6c44884d0807d9b054d23c473c106c72be9de08b7376c.mp3';

    // 设置响应头，告诉浏览器这是音频文件
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="ss.mp3"');

    // 发送 MP3 文件
    return res.sendFile(filePath);
  }

  @Get('audio')
  async getAudio(
    @Query('s') text?: string,
    @Query('v') voice?: string,
    @Res() res?: Response,
  ) {
    console.log('getAudio');
    if (!text) {
      throw new HttpException('缺少音频文件参数', HttpStatus.BAD_REQUEST);
    }

    if (!voice) {
      throw new HttpException('缺少音频文件参数角色', HttpStatus.BAD_REQUEST);
    }

    try {
      const audioFile = await this.ttsService.getAudioFile(text, voice);
      console.log(audioFile);

      // const filePath =
      //   '/Users/zhengyukun/Documents/github/Arrivo/packages/arrivo-server/audio_cache/en-CA-ClaraNeural/770e607624d689265ca6c44884d0807d9b054d23c473c106c72be9de08b7376c.mp3';

      // 设置响应头，告诉浏览器这是音频文件
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${text}.mp3"`);

      // 发送 MP3 文件
      return res.sendFile(audioFile.filePath);
    } catch (error) {
      console.log(error);
      throw new HttpException(
        '请求音频文件失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
