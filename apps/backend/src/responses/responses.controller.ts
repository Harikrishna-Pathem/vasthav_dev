import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { ListResponsesQueryDto } from './dto/list-responses-query.dto.js';
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
    @Req()
    request: {
      user: Parameters<ResponsesService['submit']>[1];
    },
  ) {
    return this.responsesService.submit(
      dto,
      request.user,
    );
  }

  @Get('survey/:surveyId')
  async listBySurvey(
    @Param('surveyId', new ParseUUIDPipe())
    surveyId: string,
    @Query() query: ListResponsesQueryDto,
    @Req()
    request: {
      user: Parameters<ResponsesService['listBySurvey']>[2];
    },
  ) {
    return this.responsesService.listBySurvey(
      surveyId,
      query,
      request.user,
    );
  }

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Req()
    request: {
      user: Parameters<ResponsesService['getById']>[1];
    },
  ) {
    return this.responsesService.getById(
      id,
      request.user,
    );
  }
}
