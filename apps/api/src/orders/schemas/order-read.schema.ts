import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderReadDocument = HydratedDocument<OrderRead>;

@Schema({
  collection: 'orders_read',
  timestamps: { createdAt: true, updatedAt: false },
})
export class OrderRead {
  @Prop({ required: true, index: true })
  orderId!: string;

  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, enum: ['PENDING', 'PAID', 'CANCELLED'], index: true })
  status!: 'PENDING' | 'PAID' | 'CANCELLED';

  @Prop({ required: true })
  buyerEmail!: string;

  @Prop({ required: true })
  total!: number;

  @Prop()
  createdAt?: Date;

  @Prop({ type: Object })
  attachment?: { filename: string; storageKey: string };
}

export const OrderReadSchema = SchemaFactory.createForClass(OrderRead);

// Indeksy pod filtry i sort
OrderReadSchema.index({ tenantId: 1, status: 1, createdAt: -1 }); // lista (status + data)
OrderReadSchema.index({ tenantId: 1, buyerEmail: 1, createdAt: -1 }); // lista (email + data)
