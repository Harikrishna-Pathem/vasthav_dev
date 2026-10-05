import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { RegistrationService } from '../src/auth/registration.service.js';

process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = '12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET = 'abcdefghijklmnopqrstuvwxzy123456';

describe('Authentication API', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    passwordHash: '',
    displayName: 'Admin User',
    role: 'ADMIN' as const,
    isActive: true,
    emailVerifiedAt: new Date(),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
    user: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const registrationMock = {
    register: jest.fn(),
    resendRegistrationOtp: jest.fn(),
    verifyRegistrationOtp: jest.fn(),
    requestPasswordReset: jest.fn(),
    verifyPasswordResetOtp: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeAll(async () => {
    prismaMock.$transaction.mockImplementation((callback: (transaction: typeof prismaMock) => unknown) => callback(prismaMock));
    user.passwordHash = await bcrypt.hash('correct horse battery staple', 12);
    prismaMock.user.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id === user.id && where.deletedAt === null) return user;
      if (where.email === user.email.toLowerCase() && where.deletedAt === null) return user;
      return null;
    });
    prismaMock.refreshToken.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'session-id',
      ...data,
      createdAt: new Date(),
      expiresAt: data.expiresAt ?? new Date(),
    }));
    prismaMock.refreshToken.update.mockResolvedValue({ id: 'session-id' });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.refreshToken.findFirst.mockResolvedValue({ id: 'session-id' });

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RegistrationService)
      .useValue(registrationMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in, reads the current user, refreshes tokens, and logs out', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'correct horse battery staple' })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      tokenType: 'Bearer',
      user: { id: user.id, email: user.email, role: user.role },
    });
    expect(loginResponse.body.accessToken).toBeTruthy();
    expect(loginResponse.body.refreshToken).toBeTruthy();
    accessToken = loginResponse.body.accessToken;
    refreshToken = loginResponse.body.refreshToken;

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: user.id, email: user.email, role: user.role });
      });

    const hashedRefreshToken = createHash('sha256').update(refreshToken).digest('hex');
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: 'session-id',
      tokenHash: hashedRefreshToken,
      userId: user.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshResponse.body).toMatchObject({
      tokenType: 'Bearer',
      user: { id: user.id, email: user.email, role: user.role },
    });
    expect(refreshResponse.body.accessToken).toBeTruthy();
    expect(refreshResponse.body.refreshToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken })
      .expect(204);

    prismaMock.refreshToken.findFirst.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('rejects invalid credentials and non-public protected access', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'correct horse battery staple', loginAs: 'USER' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('The selected login role does not match this account.');
      });

    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('exposes the password reset request, verify, and reset endpoints', async () => {
    registrationMock.requestPasswordReset.mockResolvedValue({
      message: 'If an account exists for this email, a password reset code may be sent shortly.',
    });
    registrationMock.verifyPasswordResetOtp.mockResolvedValue({
      message: 'Verification successful. Set your new password.',
      resetToken: 'a'.repeat(64),
    });
    registrationMock.resetPassword.mockResolvedValue({ message: 'Password updated successfully.' });

    await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: 'admin@example.com' })
      .expect(200)
      .expect(({ body }) => expect(body.message).toContain('If an account exists'));
    await request(app.getHttpServer())
      .post('/auth/password-reset/verify')
      .send({ email: 'admin@example.com', otp: '123456' })
      .expect(200)
      .expect(({ body }) => expect(body.resetToken).toBe('a'.repeat(64)));
    await request(app.getHttpServer())
      .post('/auth/password-reset/reset')
      .send({ resetToken: 'a'.repeat(64), newPassword: 'new secure password value', confirmNewPassword: 'new secure password value' })
      .expect(200)
      .expect(({ body }) => expect(body.message).toContain('Password updated'));

    expect(registrationMock.requestPasswordReset).toHaveBeenCalledWith('admin@example.com');
    expect(registrationMock.verifyPasswordResetOtp).toHaveBeenCalledWith({ email: 'admin@example.com', otp: '123456' });
    expect(registrationMock.resetPassword).toHaveBeenCalledWith({
      resetToken: 'a'.repeat(64),
      newPassword: 'new secure password value',
      confirmNewPassword: 'new secure password value',
    });
  });
});
