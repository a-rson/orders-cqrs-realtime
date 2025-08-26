import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { OrderWrite } from '../src/orders/schemas/order-write.schema';

describe('Orders E2E', () => {
  let app: INestApplication;
  let conn: Connection;

  beforeAll(async () => {
    // point tests to isolated DB
    process.env.MONGO_URL =
      process.env.MONGO_URL || 'mongodb://localhost:27017/orders_e2e';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.enableCors({ origin: 'http://localhost:3000', credentials: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // ensure unique index (tenantId, requestId) is created before we hit the API
    const orderWriteModel = app.get(getModelToken(OrderWrite.name));
    // await orderWriteModel.syncIndexes();

    // get raw connection to clean DB
    conn = app.get<Connection>(getConnectionToken());
    if (conn.db) {
      await conn.db.dropDatabase();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/orders should be idempotent', async () => {
    const payload = {
      requestId: 'r-e2e-1',
      tenantId: 't-123',
      buyer: { email: 'alice@example.com', name: 'Alice' },
      items: [{ sku: 'SKU-1', qty: 2, price: 10 }],
    };

    // first call -> 201
    const r1 = await request(app.getHttpServer())
      .post('/api/orders')
      .send(payload)
      .expect(201);

    expect(r1.body.orderId).toBeDefined();
    const oid = r1.body.orderId;

    // duplicate -> 200 + same orderId + header
    const r2 = await request(app.getHttpServer())
      .post('/api/orders')
      .send(payload)
      .expect(200);

    expect(r2.body.orderId).toBe(oid);
    expect(r2.headers['x-idempotent-replayed']).toBe('true');
  });

  it('GET /api/orders should list with filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/orders')
      .query({ tenantId: 't-123', status: 'PENDING', page: 1, limit: 10 })
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const row = res.body.items[0];
    expect(row).toHaveProperty('orderId');
    expect(row).toHaveProperty('buyerEmail', 'alice@example.com');
    expect(row).toHaveProperty('status'); // PENDING initially
  });
});
