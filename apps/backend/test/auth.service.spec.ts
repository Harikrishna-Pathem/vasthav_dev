import * as bcrypt from 'bcryptjs';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../src/config/app-config.service.js';
import { UserRole } from '@prisma/client';
import { LoginDto } from '../src/auth/dto/login.dto.js';

describe('AuthService', () => {
  const user = { id: '9ec2633d-1e7e-4c54-a84d-29a1d5d8d3cc', email: 'admin@example.com', role: UserRole.ADMIN, isActive: true, emailVerifiedAt: new Date(), deletedAt: null, passwordHash: '' };
  const transactionMock = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    refreshToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn((callback: (transaction: typeof transactionMock) => unknown) => callback(transactionMock)),
    user: { findFirst: jest.fn() },
    refreshToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
  };
  const jwtMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configMock = { accessTokenSecret: 'a'.repeat(40), refreshTokenSecret: 'b'.repeat(40), accessTokenTtl: '15m', refreshTokenTtl: '30d' };
  const service = new AuthService(prismaMock as unknown as PrismaService, jwtMock as unknown as JwtService, configMock as AppConfigService);
  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.$queryRaw.mockResolvedValue([]);
  });

  it('issues access and refresh tokens for an active user with valid credentials', async () => {
    user.passwordHash = await bcrypt.hash('correct horse battery staple', 4);
    prismaMock.user.findFirst.mockResolvedValue(user);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'session-id' });
    jwtMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' })).resolves.toMatchObject({ accessToken: 'access-token', refreshToken: 'refresh-token', tokenType: 'Bearer' });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-id' } }));
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.ADMIN, sid: 'session-id' }), expect.objectContaining({ secret: configMock.accessTokenSecret, expiresIn: configMock.accessTokenTtl }));
  });

  it.each([
    [UserRole.USER, UserRole.USER],
    [UserRole.SURVEYER, UserRole.SURVEYER],
    [UserRole.ADMIN, UserRole.ADMIN],
  ] as const)('allows matching login mode %s for actual role %s', async (actualRole, loginAs) => {
    const activeUser = { ...user, role: actualRole, passwordHash: await bcrypt.hash('correct horse battery staple', 4) };
    prismaMock.user.findFirst.mockResolvedValue(activeUser);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'session-id' });
    jwtMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

    const result = await service.login({ email: activeUser.email, password: 'correct horse battery staple', loginAs });

    expect(result.user.role).toBe(actualRole);
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: actualRole }), expect.any(Object));
  });

  it.each([
    [UserRole.SURVEYER, UserRole.USER],
    [UserRole.ADMIN, UserRole.USER],
    [UserRole.USER, UserRole.SURVEYER],
    [UserRole.ADMIN, UserRole.SURVEYER],
    [UserRole.USER, UserRole.ADMIN],
    [UserRole.SURVEYER, UserRole.ADMIN],
  ] as const)('rejects selected login mode %s for actual role %s', async (loginAs, actualRole) => {
    const activeUser = { ...user, role: actualRole, passwordHash: await bcrypt.hash('correct horse battery staple', 4) };
    prismaMock.user.findFirst.mockResolvedValue(activeUser);

    await expect(service.login({ email: activeUser.email, password: 'correct horse battery staple', loginAs }))
      .rejects.toThrow('The selected login role does not match this account.');
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  it('does not accept a missing email verification timestamp', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...user, emailVerifiedAt: null });
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not authenticate an inactive user', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unverified user without revealing email-specific information', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...user, emailVerifiedAt: null });
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' }))
      .rejects.toThrow('Invalid email or password');
  });

  it('rejects invalid login mode values through DTO validation', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform(
      { email: user.email, password: 'correct horse battery staple', loginAs: 'SUPERUSER' },
      { type: 'body', metatype: LoginDto, data: '' },
    )).rejects.toThrow();
    await expect(pipe.transform(
      { email: user.email, password: 'correct horse battery staple', loginAs: UserRole.USER, role: UserRole.ADMIN },
      { type: 'body', metatype: LoginDto, data: '' },
    )).rejects.toThrow();
  });

  it('uses the database role and ignores a client-supplied role property', async () => {
    const userAccount = {
      ...user,
      role: UserRole.USER,
      passwordHash: await bcrypt.hash('correct horse battery staple', 4),
    };
    prismaMock.user.findFirst.mockResolvedValue(userAccount);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'session-id' });
    jwtMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: userAccount.email,
      password: 'correct horse battery staple',
      role: UserRole.ADMIN,
    } as LoginDto);

    expect(result.user.role).toBe(UserRole.USER);
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.USER }), expect.any(Object));
  });

  it('rejects invalid credentials', async () => {
    prismaMock.user.findFirst.mockResolvedValue(user);
    await expect(service.login({ email: user.email, password: 'wrong password value' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid refresh token', async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('keeps the database role authoritative when rotating refresh tokens', async () => {
    const refreshToken = 'current-refresh-token';
    jwtMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      sid: 'session-id',
      email: user.email,
      role: UserRole.USER,
    });
    transactionMock.refreshToken.findFirst.mockResolvedValue({
      id: 'session-id',
      userId: user.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { ...user, role: UserRole.ADMIN },
    });
    transactionMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.refreshToken.create.mockResolvedValue({ id: 'new-session-id' });
    transactionMock.refreshToken.update.mockResolvedValue({ id: 'new-session-id' });
    jwtMock.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

    const result = await service.refresh(refreshToken);

    expect(result.user.role).toBe(UserRole.ADMIN);
    expect(jwtMock.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.ADMIN }), expect.any(Object));
    expect(transactionMock.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'session-id', userId: user.id, revokedAt: null, tokenHash: expect.any(String) }),
      data: { revokedAt: expect.any(Date) },
    }));
    expect(transactionMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(transactionMock.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a refresh token when another operation already consumed it', async () => {
    jwtMock.verifyAsync.mockResolvedValue({ sub: user.id, sid: 'session-id' });
    transactionMock.refreshToken.findFirst.mockResolvedValue({ id: 'session-id', userId: user.id, user });
    transactionMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('already-consumed-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('revokes a refresh token during logout', async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.logout('refresh-token-value')).resolves.toBeUndefined();
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: expect.any(String), revokedAt: null }, data: { revokedAt: expect.any(Date) } }));
  });
});
