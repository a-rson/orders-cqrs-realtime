import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000', credentials: true },
  path: '/ws', // client connects to ws://localhost:3001/ws
})
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    // simple "handshake auth": tenantId from query or auth
    const tenantId =
      (client.handshake.auth as any)?.tenantId ??
      (client.handshake.query as any)?.tenantId;

    if (!tenantId || typeof tenantId !== 'string') {
      client.disconnect(true);
      return;
    }

    const room = this.roomName(tenantId);
    client.join(room);
    client.emit('connected', { ok: true, tenantId });
  }

  private roomName(tenantId: string) {
    return `tenant:${tenantId}`;
  }

  // form service on status update
  emitOrderUpdated(
    tenantId: string,
    payload: { orderId: string; status: string },
  ) {
    this.server.to(this.roomName(tenantId)).emit('order.updated', payload);
  }
}
