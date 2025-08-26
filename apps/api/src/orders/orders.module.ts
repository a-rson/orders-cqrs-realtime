import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderWrite, OrderWriteSchema } from './schemas/order-write.schema';
import { OrderRead, OrderReadSchema } from './schemas/order-read.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderWrite.name, schema: OrderWriteSchema },
      { name: OrderRead.name, schema: OrderReadSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [],
})
export class OrdersModule {}
