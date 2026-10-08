import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserLanguage, UserRole } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service.js';

process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxzy123456';

describe('Constituency and user assignment API', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminAsSurveyHeadToken: string;
  let adminAsUserToken: string;
  let surveyHeadToken: string;
  let userToken: string;

  const adminId = '11111111-1111-4111-8111-111111111111';
  const surveyHeadId = '22222222-2222-4222-8222-222222222222';
  const userId = '33333333-3333-4333-8333-333333333333';
  const constituencyId = '44444444-4444-4444-8444-444444444444';
  const admin = {
    id: adminId, email: 'admin@example.com', role: UserRole.ADMIN, preferredLanguage: UserLanguage.en,
    isActive: true, emailVerifiedAt: new Date(), deletedAt: null,
  };
  const surveyHead = {
    id: surveyHeadId, email: 'head@example.com', role: UserRole.SURVEYER, preferredLanguage: UserLanguage.en,
    isActive: true, emailVerifiedAt: new Date(), deletedAt: null,
  };
  const user = {
    id: userId, email: 'user@example.com', role: UserRole.USER, preferredLanguage: UserLanguage.en,
    isActive: true, emailVerifiedAt: new Date(), deletedAt: null,
  };
  const assignedUser = {
    id: userId, email: user.email, displayName: 'Member', role: UserRole.USER,
    preferredLanguage: UserLanguage.en, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    constituency: { id: constituencyId, name: 'Karimnagar', isActive: true },
  };
  const constituency = {
    id: constituencyId, name: 'Karimnagar', isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  };

  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
    user: {
      findFirst: jest.fn(), update: jest.fn(),
    },
    refreshToken: { findFirst: jest.fn() },
    constituency: {
      findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
      create: jest.fn(), update: jest.fn(),
    },
  };

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    prismaMock.$transaction.mockImplementation((operation: unknown) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      if (typeof operation === 'function') return operation(prismaMock);
      throw new Error('Unexpected transaction operation');
    });
    prismaMock.user.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id === adminId) return admin;
      if (where.id === surveyHeadId) return surveyHead;
      if (where.id === userId) return user;
      return null;
    });
    prismaMock.refreshToken.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id }));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    const jwt = app.get(JwtService);
    const sign = (account: { id: string; email: string; role: UserRole }, activeRole: UserRole, sid: string) => jwt.sign({
      sub: account.id,
      email: account.email,
      actualRole: account.role,
      role: account.role,
      activeRole,
      sid,
    }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
    adminToken = sign(admin, UserRole.ADMIN, 'admin-session');
    adminAsSurveyHeadToken = sign(admin, UserRole.SURVEYER, 'admin-survey-head-session');
    adminAsUserToken = sign(admin, UserRole.USER, 'admin-user-session');
    surveyHeadToken = sign(surveyHead, UserRole.SURVEYER, 'survey-head-session');
    userToken = sign(user, UserRole.USER, 'user-session');
  });

  afterAll(async () => app.close());

  it('keeps the public list active-only and returns management counts to an admin', async () => {
    prismaMock.constituency.findMany.mockResolvedValueOnce([{ id: constituencyId, name: constituency.name }]);
    await request(app.getHttpServer())
      .get('/api/v1/constituencies')
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([{ id: constituencyId, name: 'Karimnagar' }]));
    expect(prismaMock.constituency.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { isActive: true } }));

    prismaMock.constituency.findMany.mockResolvedValueOnce([{ ...constituency, _count: { users: 1 } }]);
    prismaMock.constituency.count.mockResolvedValueOnce(1);
    await request(app.getHttpServer())
      .get('/api/v1/constituencies/manage')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.items[0]).toMatchObject({ assignedUserCount: 1, isActive: true }));
  });

  it('allows an admin to create a constituency with a trimmed name', async () => {
    prismaMock.constituency.findFirst.mockResolvedValueOnce(null);
    prismaMock.constituency.create.mockResolvedValueOnce({ ...constituency, name: 'Warangal' });
    await request(app.getHttpServer())
      .post('/api/v1/constituencies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '  Warangal  ' })
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ name: 'Warangal', assignedUserCount: 0 }));
    expect(prismaMock.constituency.create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Warangal' } }));
  });

  it('rejects unauthenticated, non-admin, and lower-active-role access to management endpoints', async () => {
    await request(app.getHttpServer()).get('/api/v1/constituencies/manage').expect(401);
    await request(app.getHttpServer()).get('/api/v1/constituencies/manage').set('Authorization', `Bearer ${userToken}`).expect(403);
    await request(app.getHttpServer()).get('/api/v1/constituencies/manage').set('Authorization', `Bearer ${surveyHeadToken}`).expect(403);
    await request(app.getHttpServer()).post('/api/v1/constituencies').send({ name: 'New Place' }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/constituencies').set('Authorization', `Bearer ${userToken}`).send({ name: 'New Place' }).expect(403);
    await request(app.getHttpServer()).post('/api/v1/constituencies').set('Authorization', `Bearer ${adminAsSurveyHeadToken}`).send({ name: 'New Place' }).expect(403);
    await request(app.getHttpServer()).post('/api/v1/constituencies').set('Authorization', `Bearer ${adminAsUserToken}`).send({ name: 'New Place' }).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/users/${userId}/constituency`).send({ constituencyId }).expect(401);
    await request(app.getHttpServer()).patch(`/api/v1/users/${userId}/constituency`).set('Authorization', `Bearer ${userToken}`).send({ constituencyId }).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/users/${userId}/constituency`).set('Authorization', `Bearer ${surveyHeadToken}`).send({ constituencyId }).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/users/${userId}/constituency`).set('Authorization', `Bearer ${adminAsUserToken}`).send({ constituencyId }).expect(403);
  });

  it('assigns a constituency through the admin endpoint and returns only safe user fields', async () => {
    prismaMock.constituency.findUnique.mockResolvedValueOnce({ id: constituencyId, isActive: true });
    prismaMock.user.update
      .mockResolvedValueOnce({ ...assignedUser, passwordHash: undefined, tokenHash: undefined })
      .mockResolvedValueOnce({ ...assignedUser, constituency: null, passwordHash: undefined, tokenHash: undefined });
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/constituency`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ constituencyId })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: userId, constituency: { id: constituencyId, name: 'Karimnagar' } });
        expect(body).not.toHaveProperty('passwordHash');
        expect(body).not.toHaveProperty('tokenHash');
        expect(body).not.toHaveProperty('refreshTokens');
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/constituency`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ constituencyId: null })
      .expect(200)
      .expect(({ body }) => expect(body.constituency).toBeNull());
  });

  it('validates create and assignment payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/constituencies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '    ' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/constituency`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });
});
