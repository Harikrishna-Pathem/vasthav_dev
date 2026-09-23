import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SubmitResponseDto } from './dto/submit-response.dto.js';
import { ResponsesService } from './responses.service.js';

@Controller('responses')
@UseGuards(JwtAuthGuard)
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
  ) {}

  @Post()
  async submit(
    @Body() dto: SubmitResponseDto,
    @Req() request: { user: Parameters<ResponsesService['submit']>[1] },
  ) {
    return this.responsesService.submit(dto, request.user);
  }
}