import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../src/config/app-config.service.js';

describe('AuthService', () => {
  const user = { id: '9ec2633d-1e7e-4c54-a84d-29a1d5d8d3cc', email: 'admin@example.com', role: 'ADMIN' as const, isActive: true, deletedAt: null, passwordHash: '' };
  const prismaMock = { user: { findFirst: jest.fn() }, refreshToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() } };
  const jwtMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configMock = { accessTokenSecret: 'a'.repeat(40), refreshTokenSecret: 'b'.repeat(40), accessTokenTtl: '15m', refreshTokenTtl: '30d' };
  const service = new AuthService(prismaMock as unknown as PrismaService, jwtMock as unknown as JwtService, configMock as AppConfigService);
  beforeEach(() => jest.clearAllMocks());

  it('issues access and refresh tokens for an active user with valid credentials', async () => {
    user.passwordHash = await bcrypt.hash('correct horse battery staple', 4);
    prismaMock.user.findFirst.mockResolvedValue(user);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'session-id' });
    jwtMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' })).resolves.toMatchObject({ accessToken: 'access-token', refreshToken: 'refresh-token', tokenType: 'Bearer' });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-id' } }));
  });

  it('does not authenticate an inactive user', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login({ email: user.email, password: 'correct horse battery staple' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid credentials', async () => {
    prismaMock.user.findFirst.mockResolvedValue(user);
    await expect(service.login({ email: user.email, password: 'wrong password value' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid refresh token', async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes a refresh token during logout', async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.logout('refresh-token-value')).resolves.toBeUndefined();
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: expect.any(String), revokedAt: null }, data: { revokedAt: expect.any(Date) } }));
  });
});
