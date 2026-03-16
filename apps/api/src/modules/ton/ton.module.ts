import { Module } from '@nestjs/common';
import { TonService } from './ton.service';
import { TonVerificationService } from './ton-verification.service';
import { TonManifestController } from './ton-manifest.controller';

@Module({
  controllers: [TonManifestController],
  providers: [TonService, TonVerificationService],
  exports: [TonService, TonVerificationService],
})
export class TonModule {}