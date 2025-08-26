import { Body, Controller, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PresignRequestDto } from './dto/presign.dto';

@Controller('uploads')
export class UploadsController {
  @Post('presign')
  async presign(@Body() dto: PresignRequestDto) {
    // content-type validation
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(dto.contentType)) {
      return { error: 'Unsupported content type' };
    }

    const orderStub = randomUUID().slice(0, 8);
    const storageKey = `tenants/${dto.tenantId}/orders/${orderStub}/${dto.filename}`;

    return {
      url: `http://localhost:3001/mock-upload/${encodeURIComponent(storageKey)}`,
      storageKey,
      expiresInSeconds: 120,
      headers: { 'Content-Type': dto.contentType },
    };
  }
}
