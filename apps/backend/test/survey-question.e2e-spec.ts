import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service.js';

process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxzy123456';

describe('Phase 4 survey and question management', () => {
  let app: INestApplication;
  let adminToken: string;
  let surveyerToken: string;
  let userToken: string;

  const adminUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    displayName: 'Primary Admin',
    role: UserRole.ADMIN,
    isActive: true,
    deletedAt: null,
  };

  const surveyerUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'surveyor@example.com',
    displayName: 'Surveyer One',
    role: UserRole.SURVEYER,
    isActive: true,
    deletedAt: null,
  };

  const plainUser = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'user@example.com',
    displayName: 'Plain User',
    role: UserRole.USER,
    isActive: true,
    deletedAt: null,
  };

  const prismaMock = {
    $transaction: jest.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    survey: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    question: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    questionOption: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    surveyQuestion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  };

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');

    prismaMock.user.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      const id = typeof where.id === 'string' ? where.id : undefined;
      const email = typeof where.email === 'string' ? where.email : undefined;
      if (id === adminUser.id || email === adminUser.email) return adminUser;
      if (id === surveyerUser.id || email === surveyerUser.email) return surveyerUser;
      if (id === plainUser.id || email === plainUser.email) return plainUser;
      return null;
    });

    prismaMock.survey.create.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'household-survey',
      name: 'Household Survey',
      description: 'Demo survey',
      status: 'DRAFT',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    prismaMock.survey.findMany.mockResolvedValue([]);
    prismaMock.survey.count.mockResolvedValue(0);
    prismaMock.question.create.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      code: 'name-q',
      text: 'What is your name?',
      description: null,
      questionType: 'TEXT',
      required: true,
      status: 'DRAFT',
      createdBy: surveyerUser.id,
      updatedBy: surveyerUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.question.count.mockResolvedValue(0);
    prismaMock.questionOption.create.mockResolvedValue({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      questionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      code: 'yes',
      value: 'Yes',
      displayOrder: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    prismaMock.questionOption.findMany.mockResolvedValue([]);
    prismaMock.questionOption.count.mockResolvedValue(0);
    prismaMock.surveyQuestion.create.mockResolvedValue({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      surveyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      questionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      displayOrder: 1,
      isRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    prismaMock.surveyQuestion.findMany.mockResolvedValue([]);
    prismaMock.surveyQuestion.count.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    const jwtService = app.get(JwtService);
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
    surveyerToken = jwtService.sign({ sub: surveyerUser.id, email: surveyerUser.email, role: surveyerUser.role }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
    userToken = jwtService.sign({ sub: plainUser.id, email: plainUser.email, role: plainUser.role }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to create a survey', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'household-survey', name: 'Household Survey', description: 'Demo survey' })
      .expect(201);
  });

  it('allows a surveyer to create a question and denies a user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${surveyerToken}`)
      .send({
        code: 'name-q',
        text: 'What is your name?',
        questionType: 'TEXT',
        required: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        code: 'unauthorized-q',
        text: 'Forbidden question',
        questionType: 'TEXT',
      })
      .expect(403);
  });

  it('rejects invalid choice questions and enforces option rules', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${surveyerToken}`)
      .send({
        code: 'single-choice-invalid',
        text: 'Do you have electricity?',
        questionType: 'SINGLE_CHOICE',
        options: [{ code: 'yes', value: 'Yes' }],
      })
      .expect(400);
  });
});
