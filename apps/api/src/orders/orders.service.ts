import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderWrite, OrderWriteDocument } from './schemas/order-write.schema';

function genOrderId() {
  return 'ord_' + Math.random().toString(36).slice(2, 10);
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(OrderWrite.name)
    private readonly orderModel: Model<OrderWriteDocument>,
  ) {}

  async create(
    dto: CreateOrderDto,
  ): Promise<{ orderId: string; duplicated: boolean }> {
    const total = dto.items.reduce((s, it) => s + it.qty * it.price, 0);

    const doc = new this.orderModel({
      orderId: genOrderId(),
      tenantId: dto.tenantId,
      requestId: dto.requestId,
      buyer: dto.buyer,
      items: dto.items,
      attachment: dto.attachment,
      status: 'PENDING',
      createdAt: new Date(),
      total,
    } as any);

    try {
      await doc.save();
      return { orderId: doc.orderId, duplicated: false };
    } catch (e: any) {
      // idempotencja: duplicate key na (tenantId, requestId)
      if (e instanceof MongoServerError && e.code === 11000) {
        const existing = await this.orderModel
          .findOne(
            { tenantId: dto.tenantId, requestId: dto.requestId },
            { orderId: 1, _id: 0 },
          )
          .lean();
        if (existing) return { orderId: existing.orderId, duplicated: true };
      }
      throw e;
    }
  }
}
