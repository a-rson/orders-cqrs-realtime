import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderWrite, OrderWriteSchema } from './schemas/order-write.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderWrite.name, schema: OrderWriteSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [],
})
export class OrdersModule {}
