import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class WorkerController {
  @Get()
  health() {
    return { status: 'ok', service: 'worker', timestamp: new Date().toISOString() };
  }
}
