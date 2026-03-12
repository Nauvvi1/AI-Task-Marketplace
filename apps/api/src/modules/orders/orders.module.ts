import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CatalogModule } from '../catalog/catalog.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CatalogModule, UsersModule, BullModule.registerQueue({ name: 'generation' })],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
