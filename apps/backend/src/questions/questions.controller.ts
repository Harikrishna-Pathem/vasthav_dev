import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { QuestionStatus, QuestionType, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission, Permissions } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { CreateQuestionOptionDto } from './dto/create-question-option.dto.js';
import { ListQuestionsQueryDto } from './dto/list-questions-query.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { UpdateQuestionOptionDto } from './dto/update-question-option.dto.js';
import { UpdateQuestionStatusDto } from './dto/update-question-status.dto.js';
import { QuestionsService } from './questions.service.js';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.SURVEYER)
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Post()
  @Permissions(Permission.QuestionWrite)
  @ApiCreatedResponse({ description: 'Question created successfully.' })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.create(dto, user);
  }

  @Get()
  @Permissions(Permission.QuestionRead)
  @ApiOkResponse({ description: 'Paginated list of questions.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: QuestionStatus })
  @ApiQuery({ name: 'questionType', required: false, enum: QuestionType })
  @ApiQuery({ name: 'search', required: false, type: String })
  list(@Query() query: ListQuestionsQueryDto) {
    return this.questions.list(query);
  }

  @Get(':id')
  @Permissions(Permission.QuestionRead)
  getById(@Param('id') id: string) {
    return this.questions.findById(id);
  }

  @Patch(':id')
  @Permissions(Permission.QuestionWrite)
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.update(id, dto, user);
  }

  @Patch(':id/status')
  @Permissions(Permission.QuestionWrite)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateQuestionStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.updateStatus(id, dto, user);
  }

  @Patch(':id/archive')
  @Permissions(Permission.QuestionWrite)
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.archive(id, user);
  }

  @Get(':questionId/options')
  @Permissions(Permission.QuestionRead)
  listOptions(@Param('questionId') questionId: string) {
    return this.questions.listQuestionOptions(questionId);
  }

  @Post(':questionId/options')
  @Permissions(Permission.QuestionWrite)
  createOption(@Param('questionId') questionId: string, @Body() dto: CreateQuestionOptionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.createOption(questionId, dto, user);
  }

  @Patch(':questionId/options/:optionId')
  @Permissions(Permission.QuestionWrite)
  updateOption(@Param('questionId') questionId: string, @Param('optionId') optionId: string, @Body() dto: UpdateQuestionOptionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.updateOption(questionId, optionId, dto, user);
  }

  @Patch(':questionId/options/:optionId/order')
  @Permissions(Permission.QuestionWrite)
  updateOrder(@Param('questionId') questionId: string, @Param('optionId') optionId: string, @Body() body: { displayOrder: number }, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.reorderOption(questionId, optionId, body.displayOrder, user);
  }
}
