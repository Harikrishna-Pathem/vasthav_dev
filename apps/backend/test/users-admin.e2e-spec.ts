import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole, UserLanguage } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service.js';

process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxzy123456';

describe('User administration API', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const adminUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    displayName: 'Primary Admin',
    role: UserRole.ADMIN,
    preferredLanguage: UserLanguage.en,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const plainUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'member@example.com',
    displayName: 'Regular User',
    role: UserRole.USER,
    preferredLanguage: UserLanguage.te,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaMock = {
    $transaction: jest.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  };

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');

    prismaMock.user.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      const email = typeof where.email === 'string' ? where.email : undefined;
      const id = typeof where.id === 'string' ? where.id : undefined;

      if (id === adminUser.id || email === adminUser.email || email === adminUser.email.toLowerCase()) return adminUser;
      if (id === plainUser.id || email === plainUser.email || email === plainUser.email.toLowerCase()) return plainUser;
      return null;
    });

    prismaMock.user.findMany.mockResolvedValue([
      { ...adminUser, passwordHash: 'hashed-admin' },
      { ...plainUser, passwordHash: 'hashed-user' },
    ]);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: '33333333-3333-4333-8333-333333333333',
      ...data,
      passwordHash: 'hashed-created-user',
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    prismaMock.user.update.mockImplementation(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => ({
      ...((where.id === adminUser.id ? adminUser : plainUser) as Record<string, unknown>),
      ...data,
      updatedAt: new Date(),
    }));
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

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
    userToken = jwtService.sign({ sub: plainUser.id, email: plainUser.email, role: plainUser.role }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows an admin to create a user with a valid role and language', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new.user@example.com',
        password: 'securePassword123',
        displayName: 'New User',
        role: UserRole.USER,
        preferredLanguage: UserLanguage.hi,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'new.user@example.com',
      displayName: 'New User',
      role: UserRole.USER,
      preferredLanguage: UserLanguage.hi,
    });
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('tokenHash');
  });

  it('rejects duplicate emails and invalid data', async () => {
    prismaMock.user.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      const email = typeof where.email === 'string' ? where.email : undefined;
      const id = typeof where.id === 'string' ? where.id : undefined;

      if (id === adminUser.id || email === 'admin@example.com' || email === adminUser.email.toLowerCase()) return adminUser;
      if (id === plainUser.id || email === plainUser.email || email === plainUser.email.toLowerCase()) return plainUser;
      return null;
    });

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'admin@example.com',
        password: 'securePassword123',
        displayName: 'Dup User',
        role: UserRole.USER,
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'bad@example.com',
        password: 'short',
        displayName: 'Bad User',
        role: 'INVALID_ROLE',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'badlang@example.com',
        password: 'securePassword123',
        displayName: 'Bad Language',
        role: UserRole.USER,
        preferredLanguage: 'fr',
      })
      .expect(400);
  });

  it('allows admin listing and denies unauthorized access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .query({ page: 1, limit: 10, role: UserRole.USER, status: 'active', search: 'user' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
    });
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0]).not.toHaveProperty('passwordHash');
    expect(response.body.data[0]).not.toHaveProperty('tokenHash');

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(fetched.body).not.toHaveProperty('passwordHash');
    expect(fetched.body).not.toHaveProperty('tokenHash');

    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${userToken}`).expect(403);
    await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${userToken}`).expect(({ body }) => {
      expect(body).toMatchObject({ statusCode: 403, message: 'Insufficient role' });
    });
  });
});
