import { Module } from '@nestjs/common';
import { TTSService } from './tts.service';
import { TTSController } from './tts.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [TTSService],
  controllers: [TTSController],
  imports: [AuthModule],
  exports: [TTSService],
})
export class TTSModule {}
