import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URL ?? 'mongodb://localhost:27017/orders',
      {
        autoIndex: true, // dev, prod false
      },
    ),
    OrdersModule,
  ],
})
export class AppModule {}
