import { Module } from '@nestjs/common';
import { TonService } from './ton.service';
import { TonVerificationService } from './ton-verification.service';

@Module({
  providers: [TonService, TonVerificationService],
  exports: [TonService, TonVerificationService],
})
export class TonModule {}