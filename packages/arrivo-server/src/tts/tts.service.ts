import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'arrivo-db';
import { AuthService } from 'src/auth/auth.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { voices, toVoice } from '../tts-node';

interface VoicePackage {
  name: string;
  gender: string;
}

@Injectable()
export class TTSService {
  prismaClient: PrismaClient = new PrismaClient();
  private readonly cacheDir: string;

  constructor(protected readonly auth: AuthService) {
    this.cacheDir = path.resolve(process.cwd(), 'audio_cache');
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  }

  private hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  async getVoices(lang?: string): Promise<VoicePackage[]> {
    return voices(lang);
  }

  async getAudioFile(text: string, voice: string = 'en-US-AndrewNeural') {
    if (!text) {
      throw new Error('Missing text parameter');
    }
    if (!voice) {
      throw new Error('Missing voice parameter');
    }

    const voiceCacheDir = path.join(this.cacheDir, voice);
    // Ensure voice-specific cache directory exists
    if (!fs.existsSync(voiceCacheDir)) {
      fs.mkdirSync(voiceCacheDir, { recursive: true });
    }

    const hash = this.hashString(text);
    const fileName = `${encodeURIComponent(hash)}.mp3`;
    const localPath = path.join(voiceCacheDir, fileName);

    // Check if file is already cached
    if (fs.existsSync(localPath)) {
      console.log(`Reading audio file from cache: ${localPath}`);
      return this.readAudioFile(localPath);
    }

    try {
      // Generate audio file
      await toVoice(text, localPath, {
        voice: voice,
        rate: 0,
        volume: 10,
        pitch: 10,
      });

      console.log(`Audio file cached to: ${localPath}`);
      const res = await this.readAudioFile(localPath);
      console.log('res', res);
      return res;
    } catch (error) {
      console.error('Error generating audio file:', error);
      throw new Error('Failed to generate audio file');
    }
  }

  private async readAudioFile(filePath: string) {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      // console.log('readAudioFile', fileBuffer);
      console.log('filePath', filePath);
      return {
        buffer: fileBuffer,
        size: fileBuffer.length,
        contentType: 'audio/mp3',
        filePath,
      };
    } catch (error) {
      console.error('Error reading audio file:', error);
      throw new Error('Failed to read audio file');
    }
  }
}
