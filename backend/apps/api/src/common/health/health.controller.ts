import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Basic liveness check — process is up and can respond.
   * No tenant/auth required so load balancers and orchestrators can hit it.
   */
  @Public()
  @Get()
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness check — confirms the database connection is actually usable,
   * not just that the process is running. Useful for orchestrators that
   * should wait before routing traffic.
   */
  @Public()
  @Get('ready')
  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return {
        status: 'error',
        database: 'unavailable',
        message: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }
}
