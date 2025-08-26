import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderWriteDocument = HydratedDocument<OrderWrite>;

type Item = { sku: string; qty: number; price: number };
type Attachment = {
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
};

@Schema({
  collection: 'orders_write',
  timestamps: { createdAt: true, updatedAt: true },
})
export class OrderWrite {
  @Prop({ required: true })
  orderId!: string;

  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  requestId!: string;

  @Prop({ required: true, type: Object })
  buyer!: { email: string; name: string };

  @Prop({ required: true, type: Array })
  items!: Item[];

  @Prop({ type: Object })
  attachment?: Attachment;

  @Prop({
    required: true,
    enum: ['PENDING', 'PAID', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  })
  status!: 'PENDING' | 'PAID' | 'CANCELLED';

  @Prop()
  createdAt?: Date;
}

export const OrderWriteSchema = SchemaFactory.createForClass(OrderWrite);

OrderWriteSchema.index({ tenantId: 1, requestId: 1 }, { unique: true }); // idempotencja
OrderWriteSchema.index({ tenantId: 1, orderId: 1 }, { unique: true });
