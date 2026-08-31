import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SurveyStatus, UserLanguage, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import { TranslationResolverService } from '../translations/translation-resolver.service.js';
import { CreateSurveyDto } from './dto/create-survey.dto.js';
import { ListSurveysQueryDto } from './dto/list-surveys-query.dto.js';
import { UpdateSurveyDto } from './dto/update-survey.dto.js';
import { UpdateSurveyStatusDto } from './dto/update-survey-status.dto.js';

const surveySelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  version: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translationResolver: TranslationResolverService,
  ) {}

  private assertCanManageSurvey(user: AuthenticatedUser, survey: { createdBy: string }) {
    if (user.role === UserRole.ADMIN) return;
    if (survey.createdBy !== user.id) {
      throw new ForbiddenException('You can only manage your own surveys');
    }
  }

  private assertMutableStatus(survey: { status: SurveyStatus }) {
    if (survey.status === SurveyStatus.PUBLISHED) {
      throw new ConflictException('Published surveys cannot be destructively modified');
    }
  }

  async create(dto: CreateSurveyDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SURVEYER) {
      throw new ForbiddenException('Survey management requires admin or surveyer access');
    }
    const code = dto.code?.trim() ?? this.defaultCode(dto.name);
    if (!code) throw new BadRequestException('Survey code is required');

    const existing = await this.prisma.survey.findFirst({ where: { code, deletedAt: null } });
    if (existing) throw new ConflictException('Survey code already exists');

    const created = await this.prisma.survey.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        status: dto.status ?? SurveyStatus.DRAFT,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: surveySelect,
    });

    return created;
  }

  async list(query: ListSurveysQueryDto, language?: string) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const skip = (safePage - 1) * safeLimit;
    const search = query.search?.trim();

    const where: Prisma.SurveyWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.survey.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          translations: { select: { language: true, name: true, description: true } },
        },
      }),
      this.prisma.survey.count({ where }),
    ]);

    const normalized = language ? data.map((survey) => {
      const resolved = this.translationResolver.resolveLanguage({
        requestedLanguage: language,
        userPreferredLanguage: undefined,
        available: survey.translations.map((translation) => ({ language: translation.language, name: translation.name, description: translation.description })),
      });
      return {
        ...survey,
        name: resolved.text,
        description: survey.translations.find((translation) => translation.language === resolved.language)?.description ?? survey.description,
        language: resolved.language,
      };
    }) : data;

    return { page: safePage, limit: safeLimit, total, data: normalized };
  }

  async findById(id: string, language?: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id, deletedAt: null },
      include: {
        translations: { select: { language: true, name: true, description: true } },
      },
    });
    if (!survey) throw new NotFoundException('Survey not found');

    if (!language) {
      return {
        ...survey,
        translations: survey.translations,
      };
    }

    const resolved = this.translationResolver.resolveLanguage({
      requestedLanguage: language,
      userPreferredLanguage: undefined,
      available: survey.translations.map((translation) => ({ language: translation.language, name: translation.name, description: translation.description })),
    });

    return {
      ...survey,
      name: resolved.text,
      description: survey.translations.find((translation) => translation.language === resolved.language)?.description ?? survey.description,
      language: resolved.language,
      translations: survey.translations,
    };
  }

  async update(id: string, dto: UpdateSurveyDto, user: AuthenticatedUser) {
    const survey = await this.findById(id);
    this.assertCanManageSurvey(user, survey);
    this.assertMutableStatus(survey);

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new BadRequestException('Survey code cannot be empty');
      const duplicate = await this.prisma.survey.findFirst({ where: { code, deletedAt: null, id: { not: id } } });
      if (duplicate) throw new ConflictException('Survey code already exists');
    }

    const updateData: Prisma.SurveyUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() ?? null } : {}),
      ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
      updatedByUser: { connect: { id: user.id } },
    };

    const updated = await this.prisma.survey.update({ where: { id }, data: updateData, select: surveySelect });
    return updated;
  }

  async updateStatus(id: string, dto: UpdateSurveyStatusDto, user: AuthenticatedUser) {
    const survey = await this.findById(id);
    this.assertCanManageSurvey(user, survey);

    if (dto.status === SurveyStatus.PUBLISHED && survey.status === SurveyStatus.PUBLISHED) {
      return survey;
    }

    if (dto.status === SurveyStatus.ARCHIVED) {
      const updated = await this.prisma.survey.update({
        where: { id },
        data: { status: SurveyStatus.ARCHIVED, updatedBy: user.id },
        select: surveySelect,
      });
      return updated;
    }

    if (dto.status === SurveyStatus.PUBLISHED) {
      const updated = await this.prisma.survey.update({
        where: { id },
        data: { status: SurveyStatus.PUBLISHED, updatedBy: user.id },
        select: surveySelect,
      });
      return updated;
    }

    if (dto.status === SurveyStatus.DRAFT) {
      const updated = await this.prisma.survey.update({
        where: { id },
        data: { status: SurveyStatus.DRAFT, updatedBy: user.id },
        select: surveySelect,
      });
      return updated;
    }

    throw new BadRequestException('Unsupported survey status');
  }

  async archive(id: string, user: AuthenticatedUser) {
    return this.updateStatus(id, { status: SurveyStatus.ARCHIVED }, user);
  }

  async getTranslations(surveyId: string, user: AuthenticatedUser) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);
    return this.prisma.surveyTranslation.findMany({
      where: { surveyId: survey.id },
      orderBy: { language: 'asc' },
    });
  }

  async createTranslation(surveyId: string, dto: { language: UserLanguage; name: string; description?: string | null }, user: AuthenticatedUser) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);
    const trimmedName = dto.name.trim();
    if (!trimmedName) throw new BadRequestException('Survey translation name cannot be empty');

    const existing = await this.prisma.surveyTranslation.findFirst({ where: { surveyId: survey.id, language: dto.language } });
    if (existing) throw new ConflictException('Survey translation already exists for this language');

    return this.prisma.surveyTranslation.create({
      data: {
        surveyId: survey.id,
        language: dto.language,
        name: trimmedName,
        description: dto.description?.trim() ?? null,
      },
    });
  }

  async updateTranslation(surveyId: string, language: UserLanguage, dto: { name?: string; description?: string | null }, user: AuthenticatedUser) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);
    const translation = await this.prisma.surveyTranslation.findFirst({ where: { surveyId: survey.id, language } });
    if (!translation) throw new NotFoundException('Survey translation not found');

    return this.prisma.surveyTranslation.update({
      where: { id: translation.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() ?? null } : {}),
      },
    });
  }

  async deleteTranslation(surveyId: string, language: UserLanguage, user: AuthenticatedUser) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);
    const translation = await this.prisma.surveyTranslation.findFirst({ where: { surveyId: survey.id, language } });
    if (!translation) throw new NotFoundException('Survey translation not found');
    await this.prisma.surveyTranslation.delete({ where: { id: translation.id } });
    return { success: true };
  }

  private defaultCode(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'survey';
  }

  async addQuestionToSurvey(surveyId: string, questionId: string, user: AuthenticatedUser, isRequired = false) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);

    const question = await this.prisma.question.findFirst({ where: { id: questionId, deletedAt: null }, select: { id: true, status: true } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status === SurveyStatus.ARCHIVED) {
      throw new ConflictException('Archived questions cannot be added to a survey');
    }

    const existing = await this.prisma.surveyQuestion.findFirst({ where: { surveyId, questionId, deletedAt: null } });
    if (existing) throw new ConflictException('Question is already on this survey');

    const nextOrder = (await this.prisma.surveyQuestion.count({ where: { surveyId, deletedAt: null } })) + 1;
    return this.prisma.surveyQuestion.create({
      data: { surveyId, questionId, displayOrder: nextOrder, isRequired },
    });
  }

  async listSurveyQuestions(surveyId: string) {
    const survey = await this.findById(surveyId);
    const rows = await this.prisma.surveyQuestion.findMany({
      where: { surveyId: survey.id, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      include: { question: true },
    });
    return rows;
  }

  async removeQuestionFromSurvey(surveyId: string, surveyQuestionId: string, user: AuthenticatedUser) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);
    if (survey.status === SurveyStatus.PUBLISHED) {
      throw new ConflictException('Published surveys cannot be freely altered');
    }

    const record = await this.prisma.surveyQuestion.findFirst({ where: { id: surveyQuestionId, surveyId, deletedAt: null } });
    if (!record) throw new NotFoundException('Survey question link not found');

    await this.prisma.surveyQuestion.delete({ where: { id: surveyQuestionId } });
    return { success: true };
  }

  async reorderQuestionInSurvey(surveyId: string, surveyQuestionId: string, displayOrder: number, user: AuthenticatedUser) {
    const survey = await this.findById(surveyId);
    this.assertCanManageSurvey(user, survey);
    if (survey.status === SurveyStatus.PUBLISHED) {
      throw new ConflictException('Published surveys cannot be freely reordered');
    }

    const record = await this.prisma.surveyQuestion.findFirst({ where: { id: surveyQuestionId, surveyId, deletedAt: null } });
    if (!record) throw new NotFoundException('Survey question link not found');

    const current = await this.prisma.surveyQuestion.findMany({ where: { surveyId, deletedAt: null } });
    const existing = current.find((item) => item.id === surveyQuestionId);
    if (!existing) throw new NotFoundException('Survey question link not found');

    const normalized = Math.max(1, Number(displayOrder) || 1);
    const others = current.filter((item) => item.id !== surveyQuestionId).sort((a, b) => a.displayOrder - b.displayOrder);
    const reordered = [...others];
    reordered.splice(normalized - 1, 0, { ...existing, displayOrder: normalized });
    for (let i = 0; i < reordered.length; i += 1) {
      await this.prisma.surveyQuestion.update({ where: { id: reordered[i].id }, data: { displayOrder: i + 1 } });
    }
    return { success: true };
  }
}
