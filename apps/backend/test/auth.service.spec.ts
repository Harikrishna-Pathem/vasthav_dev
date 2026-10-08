import * as bcrypt from 'bcryptjs';
import { ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

import { AuthService } from '../src/auth/auth.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AppConfigService } from '../src/config/app-config.service.js';
import { LoginDto } from '../src/auth/dto/login.dto.js';

describe('AuthService active roles', () => {
  const userId = '9ec2633d-1e7e-4c54-a84d-29a1d5d8d3cc';
  const user = {
    id: userId,
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    preferredLanguage: 'en',
    isActive: true,
    emailVerifiedAt: new Date(),
    deletedAt: null,
    passwordHash: '',
  };
  const transactionMock = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: { findFirst: jest.fn() },
    refreshToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn((callback: (transaction: typeof transactionMock) => unknown) => callback(transactionMock)),
    user: { findFirst: jest.fn() },
    refreshToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
  };
  const jwtMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configMock = {
    accessTokenSecret: 'a'.repeat(40),
    refreshTokenSecret: 'b'.repeat(40),
    accessTokenTtl: '15m',
    refreshTokenTtl: '30d',
  };
  const service = new AuthService(
    prismaMock as unknown as PrismaService,
    jwtMock as unknown as JwtService,
    configMock as AppConfigService,
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    transactionMock.$queryRaw.mockResolvedValue([]);
    prismaMock.user.findFirst.mockResolvedValue({
      ...user,
      passwordHash: await bcrypt.hash('correct horse battery staple', 4),
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'session-id' });
    prismaMock.refreshToken.update.mockResolvedValue({ id: 'session-id' });
    transactionMock.user.findFirst.mockResolvedValue(user);
    transactionMock.refreshToken.findFirst.mockResolvedValue({
      id: 'session-id', userId, revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user,
    });
    transactionMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.refreshToken.create.mockResolvedValue({ id: 'new-session-id' });
    transactionMock.refreshToken.update.mockResolvedValue({ id: 'new-session-id' });
    jwtMock.signAsync.mockReset().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
  });

  it.each([
    [UserRole.USER, UserRole.USER],
    [UserRole.SURVEYER, null],
    [UserRole.ADMIN, null],
  ] as const)('logs in with database role %s and initial active role %s', async (actualRole, activeRole) => {
    const actualUser = {
      ...user,
      role: actualRole,
      passwordHash: await bcrypt.hash('correct horse battery staple', 4),
    };
    prismaMock.user.findFirst.mockResolvedValue(actualUser);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'session-id' });

    const result = await service.login({ email: actualUser.email, password: 'correct horse battery staple' });

    expect(result.user).toMatchObject({ role: actualRole, actualRole, activeRole });
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({
      role: actualRole, actualRole, activeRole, sid: 'session-id',
    }), expect.objectContaining({ secret: configMock.accessTokenSecret }));
  });

  it('authenticates without accepting a client-selected role on the login request', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform(
      { email: user.email, password: 'correct horse battery staple', loginAs: UserRole.ADMIN },
      { type: 'body', metatype: LoginDto, data: '' },
    )).rejects.toThrow();

    const result = await service.login({ email: user.email, password: 'correct horse battery staple' });
    expect(result.user.activeRole).toBeNull();
  });

  it('rejects invalid credentials and inactive or unverified accounts', async () => {
    await expect(service.login({ email: user.email, password: 'wrong password value' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    prismaMock.user.findFirst.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    prismaMock.user.findFirst.mockResolvedValue({ ...user, emailVerifiedAt: null });
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' }))
      .rejects.toThrow('Invalid email or password');
  });

  it.each([
    [UserRole.USER, UserRole.USER],
    [UserRole.SURVEYER, UserRole.SURVEYER],
    [UserRole.SURVEYER, UserRole.USER],
    [UserRole.ADMIN, UserRole.ADMIN],
    [UserRole.ADMIN, UserRole.SURVEYER],
    [UserRole.ADMIN, UserRole.USER],
  ] as const)('allows actual role %s to activate %s', async (actualRole, activeRole) => {
    const account = { ...user, role: actualRole };
    transactionMock.user.findFirst.mockResolvedValue(account);
    transactionMock.refreshToken.create.mockResolvedValue({ id: 'activated-session' });

    const result = await service.activateRole({
      id: userId,
      email: user.email,
      actualRole,
      activeRole: null,
      sessionId: 'pending-session',
    }, activeRole);

    expect(result.user).toMatchObject({ role: actualRole, actualRole, activeRole });
    expect(transactionMock.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'pending-session', userId }),
      data: { revokedAt: expect.any(Date) },
    }));
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({ activeRole }), expect.any(Object));
  });

  it.each([
    [UserRole.USER, UserRole.ADMIN],
    [UserRole.USER, UserRole.SURVEYER],
    [UserRole.SURVEYER, UserRole.ADMIN],
  ] as const)('rejects actual role %s from activating %s', async (actualRole, activeRole) => {
    await expect(service.activateRole({
      id: userId,
      email: user.email,
      actualRole,
      activeRole: null,
      sessionId: 'pending-session',
    }, activeRole)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('preserves the validated active role while rotating a refresh token', async () => {
    const refreshToken = 'current-refresh-token';
    jwtMock.verifyAsync.mockResolvedValue({
      sub: userId,
      sid: 'session-id',
      email: user.email,
      role: UserRole.ADMIN,
      actualRole: UserRole.ADMIN,
      activeRole: UserRole.SURVEYER,
    });
    transactionMock.refreshToken.findFirst.mockResolvedValue({
      id: 'session-id', userId, revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
      user: { ...user, role: UserRole.ADMIN },
    });
    jwtMock.signAsync.mockReset().mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

    const result = await service.refresh(refreshToken);

    expect(result.user).toMatchObject({ actualRole: UserRole.ADMIN, activeRole: UserRole.SURVEYER });
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({
      actualRole: UserRole.ADMIN, activeRole: UserRole.SURVEYER,
    }), expect.objectContaining({ secret: configMock.accessTokenSecret }));
    expect(transactionMock.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'session-id', userId, revokedAt: null }),
    }));
  });

  it('rejects a refresh claim whose active role exceeds the current database role', async () => {
    jwtMock.verifyAsync.mockResolvedValue({ sub: userId, sid: 'session-id', activeRole: UserRole.ADMIN });
    transactionMock.refreshToken.findFirst.mockResolvedValue({
      id: 'session-id', userId, revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
      user: { ...user, role: UserRole.SURVEYER },
    });

    await expect(service.refresh('current-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
