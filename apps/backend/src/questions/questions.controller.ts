import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { QuestionStatus, QuestionType, UserLanguage, UserRole } from '@prisma/client';
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
  @ApiQuery({ name: 'language', required: false, type: String })
  list(@Query() query: ListQuestionsQueryDto, @Query('language') language?: string) {
    return this.questions.list(query, language);
  }

  @Get(':id')
  @Permissions(Permission.QuestionRead)
  @ApiQuery({ name: 'language', required: false, type: String })
  getById(@Param('id') id: string, @Query('language') language?: string) {
    return this.questions.findById(id, language);
  }

  @Get(':id/translations')
  @Permissions(Permission.QuestionRead)
  getTranslations(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.getTranslations(id, user);
  }

  @Post(':id/translations')
  @Permissions(Permission.QuestionWrite)
  createTranslation(@Param('id') id: string, @Body() dto: { language: UserLanguage; text: string; description?: string | null }, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.createTranslation(id, dto, user);
  }

  @Patch(':id/translations/:language')
  @Permissions(Permission.QuestionWrite)
  updateTranslation(@Param('id') id: string, @Param('language') language: string, @Body() dto: { text?: string; description?: string | null }, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.updateTranslation(id, language as UserLanguage, dto, user);
  }

  @Delete(':id/translations/:language')
  @Permissions(Permission.QuestionWrite)
  deleteTranslation(@Param('id') id: string, @Param('language') language: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.deleteTranslation(id, language as UserLanguage, user);
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
  @ApiQuery({ name: 'language', required: false, type: String })
  listOptions(@Param('questionId') questionId: string, @Query('language') language?: string) {
    return this.questions.listQuestionOptions(questionId, language);
  }

  @Get(':questionId/options/:optionId/translations')
  @Permissions(Permission.QuestionRead)
  getOptionTranslations(@Param('questionId') questionId: string, @Param('optionId') optionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.getOptionTranslations(questionId, optionId, user);
  }

  @Post(':questionId/options/:optionId/translations')
  @Permissions(Permission.QuestionWrite)
  createOptionTranslation(@Param('questionId') questionId: string, @Param('optionId') optionId: string, @Body() dto: { language: UserLanguage; text: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.createOptionTranslation(questionId, optionId, dto, user);
  }

  @Patch(':questionId/options/:optionId/translations/:language')
  @Permissions(Permission.QuestionWrite)
  updateOptionTranslation(@Param('questionId') questionId: string, @Param('optionId') optionId: string, @Param('language') language: string, @Body() dto: { text?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.updateOptionTranslation(questionId, optionId, language as UserLanguage, dto, user);
  }

  @Delete(':questionId/options/:optionId/translations/:language')
  @Permissions(Permission.QuestionWrite)
  deleteOptionTranslation(@Param('questionId') questionId: string, @Param('optionId') optionId: string, @Param('language') language: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questions.deleteOptionTranslation(questionId, optionId, language as UserLanguage, user);
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
