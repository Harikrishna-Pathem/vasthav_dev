import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ConstituenciesService } from './constituencies.service.js';

@ApiTags('Constituencies')
@Controller('constituencies')
export class ConstituenciesController {
  constructor(private readonly constituencies: ConstituenciesService) {}

  @Get()
  @ApiOkResponse({ description: 'Public constituency identifiers and names.' })
  list() {
    return this.constituencies.list();
  }
}
