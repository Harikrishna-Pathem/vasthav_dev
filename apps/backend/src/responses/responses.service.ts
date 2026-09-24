import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuestionType,
  SurveyStatus,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import { AuthenticatedUser } from '../auth/auth.types.js';

import { ListResponsesQueryDto } from './dto/list-responses-query.dto.js';
import { SubmitResponseDto } from './dto/submit-response.dto.js';

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(
    dto: SubmitResponseDto,
    user: AuthenticatedUser,
  ) {
    const survey = await this.prisma.survey.findFirst({
      where: {
        id: dto.surveyId,
        deletedAt: null,
      },
      include: {
        questions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            question: {
              include: {
                options: {
                  where: {
                    status: 'ACTIVE',
                    deletedAt: null,
                  },
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new ConflictException(
        'Only published surveys can receive responses',
      );
    }

    if (survey.questions.length === 0) {
      throw new BadRequestException(
        'This survey does not contain any questions',
      );
    }

    this.validateAnswers(survey.questions, dto.answers);

    const response = await this.prisma.$transaction(async (tx) => {
      const createdResponse = await tx.surveyResponse.create({
        data: {
          surveyId: survey.id,
          respondentId: user.id,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      await tx.surveyAnswer.createMany({
        data: dto.answers.map((item) => ({
          responseId: createdResponse.id,
          questionId: item.questionId,
          answer: item.answer as Prisma.InputJsonValue,
        })),
      });

      return tx.surveyResponse.findUnique({
        where: {
          id: createdResponse.id,
        },
        include: {
          answers: true,
        },
      });
    });

    return response;
  }

  async listBySurvey(
    surveyId: string,
    query: ListResponsesQueryDto,
    user: AuthenticatedUser,
  ) {
    const survey = await this.prisma.survey.findFirst({
      where: {
        id: surveyId,
        deletedAt: null,
      },
      select: {
        id: true,
        createdBy: true,
      },
    });

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    this.assertCanViewSurveyResponses(user, survey);

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where = {
      surveyId,
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
      ...(query.respondentId
        ? {
            respondentId: query.respondentId,
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.surveyResponse.findMany({
        where,
        orderBy: [
          {
            submittedAt: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          surveyId: true,
          respondentId: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.surveyResponse.count({
        where,
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(
    id: string,
    user: AuthenticatedUser,
  ) {
    const response = await this.prisma.surveyResponse.findUnique({
      where: {
        id,
      },
      include: {
        survey: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            createdBy: true,
          },
        },
        answers: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            question: {
              select: {
                id: true,
                code: true,
                text: true,
                questionType: true,
                required: true,
              },
            },
          },
        },
      },
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    this.assertCanViewSurveyResponses(user, response.survey);

    return response;
  }

  private assertCanViewSurveyResponses(
    user: AuthenticatedUser,
    survey: {
      createdBy: string;
    },
  ) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.SURVEYER) {
      if (survey.createdBy === user.id) {
        return;
      }

      throw new ForbiddenException(
        'You can only view responses for your own surveys',
      );
    }

    throw new ForbiddenException(
      'You do not have permission to view survey responses',
    );
  }

  private validateAnswers(
    surveyQuestions: Array<{
      questionId: string;
      isRequired: boolean;
      question: {
        id: string;
        questionType: QuestionType;
        options: Array<{
          id: string;
          code: string;
          value: string;
        }>;
      };
    }>,
    answers: SubmitResponseDto['answers'],
  ) {
    const questionMap = new Map(
      surveyQuestions.map((item) => [item.questionId, item]),
    );

    const submittedQuestionIds = new Set<string>();

    for (const item of answers) {
      if (submittedQuestionIds.has(item.questionId)) {
        throw new BadRequestException(
          `Duplicate answer for question ${item.questionId}`,
        );
      }

      submittedQuestionIds.add(item.questionId);

      const surveyQuestion = questionMap.get(item.questionId);

      if (!surveyQuestion) {
        throw new BadRequestException(
          `Question ${item.questionId} does not belong to this survey`,
        );
      }

      this.validateQuestionAnswer(
        surveyQuestion.question.questionType,
        surveyQuestion.question.options,
        item.answer,
        item.questionId,
      );
    }

    for (const surveyQuestion of surveyQuestions) {
      if (!surveyQuestion.isRequired) {
        continue;
      }

      if (!submittedQuestionIds.has(surveyQuestion.questionId)) {
        throw new BadRequestException(
          `Required question ${surveyQuestion.questionId} must be answered`,
        );
      }

      const submittedAnswer = answers.find(
        (item) => item.questionId === surveyQuestion.questionId,
      );

      if (
        submittedAnswer &&
        this.isEmptyAnswer(submittedAnswer.answer)
      ) {
        throw new BadRequestException(
          `Required question ${surveyQuestion.questionId} cannot be empty`,
        );
      }
    }
  }

  private validateQuestionAnswer(
    questionType: QuestionType,
    options: Array<{
      id: string;
      code: string;
      value: string;
    }>,
    answer: unknown,
    questionId: string,
  ) {
    switch (questionType) {
      case QuestionType.TEXT:
        if (typeof answer !== 'string') {
          throw new BadRequestException(
            `Question ${questionId} expects a text answer`,
          );
        }
        break;

      case QuestionType.NUMBER:
        if (
          typeof answer !== 'number' ||
          !Number.isFinite(answer)
        ) {
          throw new BadRequestException(
            `Question ${questionId} expects a numeric answer`,
          );
        }
        break;

      case QuestionType.DATE:
        if (
          typeof answer !== 'string' ||
          Number.isNaN(Date.parse(answer))
        ) {
          throw new BadRequestException(
            `Question ${questionId} expects a valid date`,
          );
        }
        break;

      case QuestionType.BOOLEAN:
        if (typeof answer !== 'boolean') {
          throw new BadRequestException(
            `Question ${questionId} expects a boolean answer`,
          );
        }
        break;

      case QuestionType.SINGLE_CHOICE:
        this.validateSingleChoice(
          options,
          answer,
          questionId,
        );
        break;

      case QuestionType.MULTIPLE_CHOICE:
        this.validateMultipleChoice(
          options,
          answer,
          questionId,
        );
        break;

      case QuestionType.IMAGE:
      case QuestionType.VIDEO:
      case QuestionType.FILE:
        throw new BadRequestException(
          `${questionType} questions are not supported in V1`,
        );

      default:
        throw new BadRequestException(
          `Unsupported question type for ${questionId}`,
        );
    }
  }

  private validateSingleChoice(
    options: Array<{ id: string; code: string; value: string }>,
    answer: unknown,
    questionId: string,
  ) {
    if (typeof answer !== 'string') {
      throw new BadRequestException(
        `Question ${questionId} expects a single option`,
      );
    }

    const valid = options.some(
      (option) =>
        option.id === answer ||
        option.code === answer,
    );

    if (!valid) {
      throw new BadRequestException(
        `Invalid option for question ${questionId}`,
      );
    }
  }

  private validateMultipleChoice(
    options: Array<{ id: string; code: string; value: string }>,
    answer: unknown,
    questionId: string,
  ) {
    if (!Array.isArray(answer) || answer.length === 0) {
      throw new BadRequestException(
        `Question ${questionId} expects one or more options`,
      );
    }

    const validOptions = new Set(
      options.flatMap((option) => [
        option.id,
        option.code,
      ]),
    );

    const uniqueAnswers = new Set(answer);

    if (uniqueAnswers.size !== answer.length) {
      throw new BadRequestException(
        `Duplicate options are not allowed for question ${questionId}`,
      );
    }

    for (const selected of answer) {
      if (
        typeof selected !== 'string' ||
        !validOptions.has(selected)
      ) {
        throw new BadRequestException(
          `Invalid option for question ${questionId}`,
        );
      }
    }
  }

  private isEmptyAnswer(answer: unknown): boolean {
    if (answer === null || answer === undefined) {
      return true;
    }

    if (typeof answer === 'string') {
      return answer.trim().length === 0;
    }

    if (Array.isArray(answer)) {
      return answer.length === 0;
    }

    return false;
  }
}
