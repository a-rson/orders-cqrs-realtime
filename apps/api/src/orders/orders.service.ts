import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderWrite, OrderWriteDocument } from './schemas/order-write.schema';
import { OrderRead, OrderReadDocument } from './schemas/order-read.schema';
import { ListOrdersQuery } from './dto/list-orders.query';

function genOrderId() {
  return 'ord_' + Math.random().toString(36).slice(2, 10);
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(OrderWrite.name)
    private readonly orderModel: Model<OrderWriteDocument>,
    @InjectModel(OrderRead.name)
    private readonly orderReadModel: Model<OrderReadDocument>,
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

      await this.orderReadModel.create({
        orderId: doc.orderId,
        tenantId: doc.tenantId,
        status: doc.status,
        buyerEmail: doc.buyer.email,
        total,
        createdAt: doc.createdAt,
        attachment: doc.attachment
          ? {
              filename: doc.attachment.filename,
              storageKey: doc.attachment.storageKey,
            }
          : undefined,
      });

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

  async list(q: ListOrdersQuery) {
    const { tenantId, status, buyerEmail, from, to, page, limit } = q;

    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (buyerEmail) filter.buyerEmail = buyerEmail;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const skip = (page - 1) * limit;

    // Równolegle: items + total
    const [items, total] = await Promise.all([
      this.orderReadModel
        .find(filter, { _id: 0, updatedAt: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderReadModel.countDocuments(filter),
    ]);

    // Odpowiedź w formacie z briefu
    return {
      items: items.map((it) => ({
        orderId: it.orderId,
        status: it.status,
        createdAt: it.createdAt?.toISOString(),
        buyerEmail: it.buyerEmail,
        total: it.total,
        attachment: it.attachment,
      })),
      page,
      limit,
      total,
    };
  }
}
