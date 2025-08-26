import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto, @Res() res: Response) {
    const { orderId, duplicated } = await this.orders.create(dto);

    // idempotencja -> przy duplikacie zwróć ten sam orderId i 200 (lub 409).
    // 200 + nagłówek informacyjny.
    if (duplicated) {
      res.setHeader('x-idempotent-replayed', 'true');
      return res.status(HttpStatus.OK).json({ orderId });
    }
    return res.status(HttpStatus.CREATED).json({ orderId });
  }
}
