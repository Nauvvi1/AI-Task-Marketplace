import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'generation' }), OrdersModule],
  providers: [AiService, AiProcessor],
  exports: [AiService],
})
export class AiModule {}
