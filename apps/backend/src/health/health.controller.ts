import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: PrismaService) {}
  @Get()
  @ApiOperation({ summary: 'Check application and database health' })
  @ApiOkResponse({ description: 'The service is healthy.' })
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.database.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
}
