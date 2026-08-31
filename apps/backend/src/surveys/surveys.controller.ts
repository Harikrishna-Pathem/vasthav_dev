import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SurveyStatus, UserLanguage, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission, Permissions } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateSurveyDto } from './dto/create-survey.dto.js';
import { ListSurveysQueryDto } from './dto/list-surveys-query.dto.js';
import { UpdateSurveyDto } from './dto/update-survey.dto.js';
import { UpdateSurveyStatusDto } from './dto/update-survey-status.dto.js';
import { SurveysService } from './surveys.service.js';

@ApiTags('Surveys')
@ApiBearerAuth()
@Controller('surveys')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.SURVEYER)
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Post()
  @Permissions(Permission.SurveyWrite)
  @ApiCreatedResponse({ description: 'Survey created successfully.' })
  create(@Body() dto: CreateSurveyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.create(dto, user);
  }

  @Get()
  @Permissions(Permission.SurveyRead)
  @ApiOkResponse({ description: 'Paginated list of surveys.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: SurveyStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'language', required: false, type: String })
  list(@Query() query: ListSurveysQueryDto, @Query('language') language?: string) {
    return this.surveys.list(query, language);
  }

  @Get(':id')
  @Permissions(Permission.SurveyRead)
  @ApiQuery({ name: 'language', required: false, type: String })
  getById(@Param('id') id: string, @Query('language') language?: string) {
    return this.surveys.findById(id, language);
  }

  @Get(':id/translations')
  @Permissions(Permission.SurveyRead)
  getTranslations(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.getTranslations(id, user);
  }

  @Post(':id/translations')
  @Permissions(Permission.SurveyWrite)
  createTranslation(@Param('id') id: string, @Body() dto: { language: UserLanguage; name: string; description?: string | null }, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.createTranslation(id, dto, user);
  }

  @Patch(':id/translations/:language')
  @Permissions(Permission.SurveyWrite)
  updateTranslation(@Param('id') id: string, @Param('language') language: string, @Body() dto: { name?: string; description?: string | null }, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.updateTranslation(id, language as UserLanguage, dto, user);
  }

  @Delete(':id/translations/:language')
  @Permissions(Permission.SurveyWrite)
  deleteTranslation(@Param('id') id: string, @Param('language') language: string, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.deleteTranslation(id, language as UserLanguage, user);
  }

  @Patch(':id')
  @Permissions(Permission.SurveyWrite)
  update(@Param('id') id: string, @Body() dto: UpdateSurveyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.update(id, dto, user);
  }

  @Patch(':id/status')
  @Permissions(Permission.SurveyWrite)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSurveyStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.updateStatus(id, dto, user);
  }

  @Patch(':id/archive')
  @Permissions(Permission.SurveyWrite)
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.archive(id, user);
  }

  @Post(':surveyId/questions/:questionId')
  @Permissions(Permission.SurveyWrite)
  addQuestion(@Param('surveyId') surveyId: string, @Param('questionId') questionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.addQuestionToSurvey(surveyId, questionId, user, false);
  }

  @Get(':surveyId/questions')
  @Permissions(Permission.SurveyRead)
  listQuestions(@Param('surveyId') surveyId: string) {
    return this.surveys.listSurveyQuestions(surveyId);
  }

  @Patch(':surveyId/questions/:surveyQuestionId/order')
  @Permissions(Permission.SurveyWrite)
  reorderQuestion(@Param('surveyId') surveyId: string, @Param('surveyQuestionId') surveyQuestionId: string, @Body() body: { displayOrder: number }, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.reorderQuestionInSurvey(surveyId, surveyQuestionId, body.displayOrder, user);
  }

  @Delete(':surveyId/questions/:surveyQuestionId')
  @Permissions(Permission.SurveyWrite)
  removeQuestion(@Param('surveyId') surveyId: string, @Param('surveyQuestionId') surveyQuestionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.surveys.removeQuestionFromSurvey(surveyId, surveyQuestionId, user);
  }
}
