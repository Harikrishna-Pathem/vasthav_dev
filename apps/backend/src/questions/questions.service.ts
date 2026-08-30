import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionStatus, QuestionType, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { ListQuestionsQueryDto } from './dto/list-questions-query.dto.js';
import { UpdateQuestionStatusDto } from './dto/update-question-status.dto.js';
import { CreateQuestionOptionDto } from './dto/create-question-option.dto.js';
import { UpdateQuestionOptionDto } from './dto/update-question-option.dto.js';

const questionSelect = {
  id: true,
  code: true,
  text: true,
  description: true,
  questionType: true,
  required: true,
  status: true,
  version: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanManageQuestion(user: AuthenticatedUser, question: { createdBy: string }) {
    if (user.role === UserRole.ADMIN) return;
    if (question.createdBy !== user.id) throw new ForbiddenException('You can only manage your own questions');
  }

  private assertQuestionEditable(question: { status: QuestionStatus; questionType: QuestionType }) {
    if (question.status === QuestionStatus.PUBLISHED) {
      throw new ConflictException('Published questions cannot be destructively modified');
    }
  }

  private validateChoiceOptions(questionType: QuestionType, options?: Array<{ code?: string; value?: string }>) {
    if (questionType !== QuestionType.SINGLE_CHOICE && questionType !== QuestionType.MULTIPLE_CHOICE) {
      return;
    }
    if (!options || options.length < 2) {
      throw new BadRequestException(`${questionType} questions require at least 2 valid options`);
    }

    const normalized = options.filter((option) => option && option.code && option.value);
    if (normalized.length < 2) {
      throw new BadRequestException(`${questionType} questions require at least 2 valid options`);
    }

    const codes = new Set<string>();
    for (const option of normalized) {
      const code = String(option.code).trim();
      const value = String(option.value).trim();
      if (!code || !value) throw new BadRequestException('Each option must include code and value');
      if (codes.has(code)) throw new ConflictException('Duplicate option codes are not allowed');
      codes.add(code);
    }
  }

  async create(dto: CreateQuestionDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SURVEYER) {
      throw new ForbiddenException('Question management requires admin or surveyer access');
    }

    this.validateChoiceOptions(dto.questionType, dto.options);

    const code = dto.code?.trim() ?? this.defaultCode(dto.text);
    const existing = await this.prisma.question.findFirst({ where: { code, deletedAt: null } });
    if (existing) throw new ConflictException('Question code already exists');

    const created = await this.prisma.question.create({
      data: {
        code,
        text: dto.text.trim(),
        description: dto.description?.trim() ?? null,
        questionType: dto.questionType,
        required: dto.required ?? false,
        status: dto.status ?? QuestionStatus.DRAFT,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: questionSelect,
    });

    if (dto.options && dto.options.length > 0) {
      await this.prisma.questionOption.createMany({
        data: dto.options.map((option, index) => ({
          questionId: created.id,
          code: option.code.trim(),
          value: option.value.trim(),
          displayOrder: index + 1,
          status: option.status ?? 'ACTIVE',
        })),
      });
    }

    return created;
  }

  async list(query: ListQuestionsQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const skip = (safePage - 1) * safeLimit;
    const search = query.search?.trim();

    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.questionType ? { questionType: query.questionType } : {}),
      ...(search
        ? {
            OR: [
              { text: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({ where, skip, take: safeLimit, orderBy: { createdAt: 'desc' }, select: questionSelect }),
      this.prisma.question.count({ where }),
    ]);

    return { page: safePage, limit: safeLimit, total, data };
  }

  async findById(id: string) {
    const question = await this.prisma.question.findFirst({ where: { id, deletedAt: null }, select: questionSelect });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto, user: AuthenticatedUser) {
    const question = await this.findById(id);
    this.assertCanManageQuestion(user, question);
    this.assertQuestionEditable(question);

    if (dto.questionType !== undefined && dto.questionType !== question.questionType) {
      if (question.status === QuestionStatus.PUBLISHED) {
        throw new ConflictException('Published question answer type cannot be changed');
      }
    }

    const nextType = dto.questionType ?? question.questionType;
    const nextOptions = dto.options ?? undefined;
    this.validateChoiceOptions(nextType, nextOptions);

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      const duplicate = await this.prisma.question.findFirst({ where: { code, deletedAt: null, id: { not: id } } });
      if (duplicate) throw new ConflictException('Question code already exists');
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.text !== undefined ? { text: dto.text.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() ?? null } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.questionType !== undefined ? { questionType: dto.questionType } : {}),
        updatedBy: user.id,
      },
      select: questionSelect,
    });

    if (dto.options !== undefined) {
      await this.prisma.questionOption.updateMany({ where: { questionId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      if (dto.options.length > 0) {
        await this.prisma.questionOption.createMany({
          data: dto.options.map((option, index) => ({
            questionId: id,
            code: option.code.trim(),
            value: option.value.trim(),
            displayOrder: index + 1,
            status: option.status ?? 'ACTIVE',
          })),
        });
      }
    }

    return updated;
  }

  async updateStatus(id: string, dto: UpdateQuestionStatusDto, user: AuthenticatedUser) {
    const question = await this.findById(id);
    this.assertCanManageQuestion(user, question);

    if (dto.status === QuestionStatus.ARCHIVED) {
      const updated = await this.prisma.question.update({
        where: { id },
        data: { status: QuestionStatus.ARCHIVED, updatedBy: user.id },
        select: questionSelect,
      });
      return updated;
    }

    if (dto.status === QuestionStatus.DRAFT && question.status === QuestionStatus.ARCHIVED) {
      const updated = await this.prisma.question.update({
        where: { id },
        data: { status: QuestionStatus.DRAFT, updatedBy: user.id },
        select: questionSelect,
      });
      return updated;
    }

    if (dto.status === QuestionStatus.PUBLISHED) {
      const updated = await this.prisma.question.update({
        where: { id },
        data: { status: QuestionStatus.PUBLISHED, updatedBy: user.id },
        select: questionSelect,
      });
      return updated;
    }

    throw new BadRequestException('Unsupported question status');
  }

  async archive(id: string, user: AuthenticatedUser) {
    return this.updateStatus(id, { status: QuestionStatus.ARCHIVED }, user);
  }

  async listQuestionOptions(questionId: string) {
    const question = await this.findById(questionId);
    return this.prisma.questionOption.findMany({ where: { questionId: question.id, deletedAt: null }, orderBy: { displayOrder: 'asc' } });
  }

  async createOption(questionId: string, dto: CreateQuestionOptionDto, user: AuthenticatedUser) {
    const question = await this.findById(questionId);
    this.assertCanManageQuestion(user, question);
    if (question.status === QuestionStatus.PUBLISHED) {
      throw new ConflictException('Published question options cannot be destructively changed');
    }

    const existing = await this.prisma.questionOption.findFirst({ where: { questionId, code: dto.code.trim(), deletedAt: null } });
    if (existing) throw new ConflictException('Option code already exists');

    const count = await this.prisma.questionOption.count({ where: { questionId, deletedAt: null } });
    return this.prisma.questionOption.create({
      data: {
        questionId,
        code: dto.code.trim(),
        value: dto.value.trim(),
        displayOrder: count + 1,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async updateOption(questionId: string, optionId: string, dto: UpdateQuestionOptionDto, user: AuthenticatedUser) {
    const question = await this.findById(questionId);
    this.assertCanManageQuestion(user, question);
    if (question.status === QuestionStatus.PUBLISHED) {
      throw new ConflictException('Published question options cannot be destructively changed');
    }

    const option = await this.prisma.questionOption.findFirst({ where: { id: optionId, questionId, deletedAt: null } });
    if (!option) throw new NotFoundException('Question option not found');

    return this.prisma.questionOption.update({
      where: { id: optionId },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async reorderOption(questionId: string, optionId: string, displayOrder: number, user: AuthenticatedUser) {
    const question = await this.findById(questionId);
    this.assertCanManageQuestion(user, question);
    if (question.status === QuestionStatus.PUBLISHED) {
      throw new ConflictException('Published question options cannot be reordered freely');
    }

    const option = await this.prisma.questionOption.findFirst({ where: { id: optionId, questionId, deletedAt: null } });
    if (!option) throw new NotFoundException('Question option not found');

    const current = await this.prisma.questionOption.findMany({ where: { questionId, deletedAt: null }, orderBy: { displayOrder: 'asc' } });
    const normalized = Math.max(1, Number(displayOrder) || 1);
    const filtered = current.filter((item) => item.id !== optionId);
    const next = [...filtered];
    next.splice(normalized - 1, 0, { ...option, displayOrder: normalized });
    for (let i = 0; i < next.length; i += 1) {
      await this.prisma.questionOption.update({ where: { id: next[i].id }, data: { displayOrder: i + 1 } });
    }
    return { success: true };
  }

  private defaultCode(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'question';
  }
}
