import { Module } from '@nestjs/common';
import { MddService } from './mdd.service';
import { MddController } from './mdd.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [MddService],
  controllers: [MddController],
  imports: [AuthModule],
  exports: [],
})
export class MddModule {}
