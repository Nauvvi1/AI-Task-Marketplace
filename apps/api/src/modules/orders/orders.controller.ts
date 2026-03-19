import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateBriefDto } from './dto/update-brief.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Patch(':id/brief')
  updateBrief(@Param('id') id: string, @Body() dto: UpdateBriefDto) {
    return this.ordersService.updateBrief(id, dto);
  }

  @Get()
  listOrders(
    @Query('telegramId') telegramId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.listOrdersByTelegramId(
      telegramId,
      Number(page || 1),
      Number(limit || 5),
    );
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post(':id/regenerate')
  regenerate(@Param('id') id: string) {
    return this.ordersService.regenerateOrder(id);
  }
}
