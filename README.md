Backend README — Orders CQRS Module (NestJS + MongoDB + WS + Presign)

This repo implements a minimal Orders module following CQRS + projections + realtime requirements.

Focus here is on the backend (apps/api). Frontend steps can follow later.

Stack

Runtime: Node 22

Package manager: pnpm (workspace)

Backend: NestJS (TypeScript, strict)

Database: MongoDB (via @nestjs/mongoose / Mongoose)

Realtime: WebSocket (Socket.IO via Nest Gateway)

Upload presign (mock): simple presign endpoint + optional local PUT sink

Docker (infra): MongoDB + mongo-express

Monorepo layout
/
├─ pnpm-workspace.yaml
├─ package.json
├─ infra/
│  └─ docker-compose.yml       # Mongo + mongo-express
└─ apps/
   ├─ api/                     # NestJS backend
   │  └─ src/
   │     ├─ app.module.ts
   │     ├─ mock-upload.controller.ts       # optional PUT sink for presigned URL
   │     └─ orders/                          # Orders module (CQRS + projections + WS)
   │        ├─ dto/
   │        │  ├─ create-order.dto.ts
   │        │  └─ list-orders.query.ts
   │        ├─ schemas/
   │        │  ├─ order-write.schema.ts     # write model
   │        │  └─ order-read.schema.ts      # read model (projection)
   │        ├─ orders.controller.ts         # POST /orders, GET /orders
   │        ├─ orders.service.ts            # command handler + projection + status simulation
   │        └─ orders.gateway.ts            # WebSocket gateway (per-tenant rooms)
   └─ web/ (Next.js app – optional, not required to run backend)

Prerequisites

Node 18+ (tested on Node 22)

pnpm 10+

Docker + Docker Compose

Setup & Run
1) Install dependencies

From repo root:

pnpm install

2) Start infrastructure (Mongo)
docker compose -f infra/docker-compose.yml up -d
# optional UI: http://localhost:8081

3) Configure API env (dev)

apps/api/.env.example is provided. For local dev, create apps/api/.env:

MONGO_URL=mongodb://localhost:27017/orders
PORT=3001
CORS_ORIGIN=http://localhost:3000


In dev, Mongoose runs with autoIndex: true to create indexes automatically. In production you should manage indexes explicitly (migrations) and set autoIndex: false.

4) Run the API (watch mode)
pnpm --filter api dev
# API listens on http://localhost:3001, global prefix: /api

API Overview
CQRS + Projections

Write model (orders_write collection) holds the full order document and enforces idempotency using a unique index on (tenantId, requestId).

Projection / Read model (orders_read collection) stores denormalized rows optimized for listing (fields: orderId, status, buyerEmail, total, createdAt, attachment), with indexes for query filters.

After creating an order in the write model, the service projects a row into the read model.

A background simulation updates status from PENDING to PAID after ~5s, updating both write and read models and emitting a realtime event.

Idempotency

Unique index (tenantId, requestId) on the write model prevents duplicates.

On duplicate insert (Mongo error 11000), the API returns the existing orderId with HTTP 200 (and header x-idempotent-replayed: true). First-time creation returns 201.

WebSocket (Realtime)

Socket.IO gateway at ws://localhost:3001/ws.

Handshake requires a tenantId (provided via auth or query).

Sockets join room tenant:<tenantId>.

When status changes (PENDING → PAID), the gateway emits:

{ "type": "order.updated", "payload": { "orderId": "...", "status": "PAID" } }


(Emitted as Socket.IO event order.updated with { orderId, status }.)

Presign (Mock)

POST /api/uploads/presign validates metadata and returns:

url (mock PUT endpoint),

storageKey,

expiresInSeconds,

headers to use for the PUT.

Optional PUT /mock-upload/:key sink accepts the file and logs size/content-type (does not store content).

Endpoints

Base URL: http://localhost:3001/api

Create Order (Command)

POST /api/orders

Request body:

{
  "requestId": "r1",
  "tenantId": "t-123",
  "buyer": { "email": "alice@example.com", "name": "Alice" },
  "items": [{ "sku": "SKU-1", "qty": 2, "price": 49.99 }],
  "attachment": {
    "filename": "invoice.pdf",
    "contentType": "application/pdf",
    "size": 123456,
    "storageKey": "tenants/t-123/orders/001/invoice.pdf"
  }
}


Responses:

201 Created → { "orderId": "ord_abc123" } (first create)

200 OK + header x-idempotent-replayed: true → { "orderId": "ord_abc123" } (duplicate (tenantId, requestId))

List Orders (Query / Projection)

GET /api/orders?tenantId=t-123&status=PENDING&buyerEmail=alice@example.com&from=2025-08-20&to=2025-08-28&page=1&limit=10

Response:

{
  "items": [
    {
      "orderId": "ord_abc123",
      "status": "PENDING",
      "createdAt": "2025-08-26T09:00:00.000Z",
      "buyerEmail": "alice@example.com",
      "total": 99.98,
      "attachment": { "filename": "invoice.pdf", "storageKey": "tenants/t-123/orders/001/invoice.pdf" }
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}

Presign Upload (Mock)

POST /api/uploads/presign

Request body:

{
  "tenantId": "t-123",
  "filename": "invoice.pdf",
  "contentType": "application/pdf",
  "size": 123456
}


Response:

{
  "url": "http://localhost:3001/mock-upload/tenants%2Ft-123%2Forders%2Fabcd1234%2Finvoice.pdf",
  "storageKey": "tenants/t-123/orders/abcd1234/invoice.pdf",
  "expiresInSeconds": 120,
  "headers": { "Content-Type": "application/pdf" }
}

Optional Mock PUT Sink

PUT /mock-upload/:key
Accepts the body stream and logs size/content-type (for local testing of the PUT step).

WebSocket

Server: ws://localhost:3001/ws (Socket.IO)

Handshake example (Socket.IO client):

const socket = io('http://localhost:3001', {
  path: '/ws',
  transports: ['websocket'],
  auth: { tenantId: 't-123' }
});
socket.on('order.updated', (msg) => console.log(msg));


Emitted event on status change:

{ "orderId": "ord_...", "status": "PAID" }

Indexes

Write model (orders_write):

unique (tenantId, requestId) — idempotency

unique (tenantId, orderId) — lookup by business id

status is indexed for possible future write-side workflows

Read model (orders_read):

(tenantId, status, createdAt desc) — list by status + recency

(tenantId, buyerEmail, createdAt desc) — list by buyer + recency

In dev, these are created automatically by Mongoose (autoIndex: true). In production, manage via migrations and set autoIndex: false.

cURL Quick Start
Create (first call)
curl -i -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"r1","tenantId":"t-123","buyer":{"email":"alice@example.com","name":"Alice"},"items":[{"sku":"SKU-1","qty":2,"price":49.99}]}'

Create (duplicate)
curl -i -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"r1","tenantId":"t-123","buyer":{"email":"alice@example.com","name":"Alice"},"items":[{"sku":"SKU-1","qty":2,"price":49.99}]}'
# expect: 200 OK + x-idempotent-replayed: true

List with filters
curl -s 'http://localhost:3001/api/orders?tenantId=t-123&status=PENDING&buyerEmail=alice@example.com&page=1&limit=10' | jq

Presign → PUT (mock) → Create with storageKey
# presign
PRES=$(curl -s -XPOST http://localhost:3001/api/uploads/presign \
  -H 'Content-Type: application/json' \
  -d '{"tenantId":"t-123","filename":"invoice.pdf","contentType":"application/pdf","size":6}')

URL=$(echo "$PRES" | jq -r .url)
SK=$(echo "$PRES" | jq -r .storageKey)

# upload mock file
echo "hello" > /tmp/invoice.pdf
curl -s -T /tmp/invoice.pdf "$URL" -H 'Content-Type: application/pdf'

# create order referencing storageKey
curl -s -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\":\"r-upload-1\",\"tenantId\":\"t-123\",\"buyer\":{\"email\":\"alice@example.com\",\"name\":\"Alice\"},\"items\":[{\"sku\":\"SKU-1\",\"qty\":1,\"price\":9.99}],\"attachment\":{\"filename\":\"invoice.pdf\",\"contentType\":\"application/pdf\",\"size\":6,\"storageKey\":\"$SK\"}}"

Notes and Trade-offs

Idempotency is enforced at DB level (unique index), not only in app logic, preventing race conditions.

Projection is performed inline after write to keep the MVP simple. In a fuller design, you would publish OrderCreated and have a separate projector consume it (e.g., via outbox/Kafka), updating the read model.

Status change simulation uses a timeout to demonstrate the realtime flow. In a real system, this would be triggered by payment confirmation or a domain workflow.

Presign is mocked; replace it with actual S3/MinIO presign logic (signing SDK, TTL, content-type and size conditions).

Security is minimal (handshake tenantId only). In real-world scenarios, use JWT (httpOnly cookies or Authorization header) and validate tenancy per user.

Scripts

From repo root:

# Run API
pnpm --filter api dev

# Run infra
docker compose -f infra/docker-compose.yml up -d

# Build all (placeholder)
pnpm -r build

# Start all (placeholder)
pnpm start


If anything fails on your machine, check:

Docker is running and mongo is healthy.

apps/api/.env points to mongodb://localhost:27017/orders.

The API listens on :3001 and you’re calling http://localhost:3001/api/....



Frontend (apps/web)

The frontend is a minimal Next.js 14+ (App Router) app.

Features

SSR orders list at /orders

Fetches from GET /api/orders

Subscribes to WebSocket (order.updated) and auto-refreshes

New order form at /orders/new

Flow: presign → PUT file → POST /api/orders

Shows optimistic order row (PENDING), then auto-updates to PAID from WS

Setup

From repo root:

pnpm --filter web dev
# open http://localhost:3000/orders

Configuration

apps/web/next.config.ts proxies API calls:

rewrites: [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }]


So the frontend always calls /api/... (Next dev server on 3000 forwards to backend on 3001).

Test flow

Go to http://localhost:3000/orders/new

Fill in buyer, items, and optionally upload a file

Click Create → redirected to /orders

After ~5s, status changes from PENDING to PAID without reload




Manual Smoke Test (end-to-end)
0) One-time check

From repo root, confirm files exist:

ls infra/docker-compose.yml apps/api apps/web >/dev/null


Make sure apps/api/.env is present with for example:

MONGO_URL=mongodb://localhost:27017/orders
PORT=3001
CORS_ORIGIN=http://localhost:3000

1) Start database (Docker)
# terminal A (keep running)
docker compose -f infra/docker-compose.yml up -d
docker ps | grep -E 'mongo|mongo-express'
# optional UI: http://localhost:8081

2) Install dependencies (monorepo)
# terminal B (repo root)
pnpm install

3) Run the API (NestJS)
pnpm --filter api dev
# expect: Nest application successfully started on http://localhost:3001 with global prefix /api

4) Run the Web (Next.js)
# terminal C
pnpm --filter web dev
# open http://localhost:3000/orders

A. Test create order (idempotency + projection)

Create order (1st call):

curl -i -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"r1","tenantId":"t-123","buyer":{"email":"alice@example.com","name":"Alice"},"items":[{"sku":"SKU-1","qty":2,"price":49.99}]}'
# expect: 201 Created + {"orderId":"ord_..."}


Duplicate call (idempotency):

curl -i -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"r1","tenantId":"t-123","buyer":{"email":"alice@example.com","name":"Alice"},"items":[{"sku":"SKU-1","qty":2,"price":49.99}]}'
# expect: 200 OK + header x-idempotent-replayed: true + same orderId


List orders (projection):

curl -s 'http://localhost:3001/api/orders?tenantId=t-123&page=1&limit=10' | jq
# expect: array with the order; status = PENDING initially

B. Test realtime WS auto-refresh

Keep http://localhost:3000/orders open in the browser.

Create another order (new requestId):

curl -s -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"r2","tenantId":"t-123","buyer":{"email":"alice@example.com","name":"Alice"},"items":[{"sku":"SKU-2","qty":1,"price":10}]}'


After ~5s the row should flip from PENDING to PAID automatically (via WS event order.updated).

C. Test presign upload flow

Presign request:

PRES=$(curl -s -XPOST http://localhost:3001/api/uploads/presign \
  -H 'Content-Type: application/json' \
  -d '{"tenantId":"t-123","filename":"invoice.pdf","contentType":"application/pdf","size":6}')
URL=$(echo "$PRES" | jq -r .url)
SK=$(echo "$PRES" | jq -r .storageKey)


Upload file (mock PUT sink):

echo "hello" > /tmp/invoice.pdf
curl -i -T /tmp/invoice.pdf "$URL" -H 'Content-Type: application/pdf'
# expect: 200 OK + {"ok":true,"storageKey":"...","size":6}


Create order referencing storageKey:

curl -s -XPOST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\":\"r3\",\"tenantId\":\"t-123\",\"buyer\":{\"email\":\"alice@example.com\",\"name\":\"Alice\"},\"items\":[{\"sku\":\"SKU-3\",\"qty\":1,\"price\":9.99}],\"attachment\":{\"filename\":\"invoice.pdf\",\"contentType\":\"application/pdf\",\"size\":6,\"storageKey\":\"$SK\"}}"