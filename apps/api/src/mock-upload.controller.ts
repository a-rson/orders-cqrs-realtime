import { Controller, Headers, Param, Put, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('mock-upload')
export class MockUploadController {
  @Put(':key')
  async put(
    @Param('key') key: string,
    @Headers('content-type') ct: string,
    @Req() req: Request,
  ) {
    let size = 0;
    await new Promise<void>((res, rej) => {
      req.on('data', (b) => (size += (b as Buffer).length));
      req.on('end', res);
      req.on('error', rej);
    });
    console.log(`[mock-upload] ${decodeURIComponent(key)} ${ct} ${size}B`);
    return { ok: true, storageKey: decodeURIComponent(key), size };
  }
}
