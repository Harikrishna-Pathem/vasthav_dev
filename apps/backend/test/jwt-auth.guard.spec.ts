import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

import { AppConfigService } from '../src/config/app-config.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard.js';

describe('JwtAuthGuard active role validation', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
  const jwt = { verifyAsync: jest.fn() };
  const config = { accessTokenSecret: 'a'.repeat(40) };
  const prisma = {
    user: { findFirst: jest.fn() },
    refreshToken: { findFirst: jest.fn() },
  };
  const guard = new JwtAuthGuard(
    reflector as never,
    jwt as unknown as JwtService,
    config as AppConfigService,
    prisma as unknown as PrismaService,
  );

  const run = async (payload: Record<string, unknown>, role: UserRole) => {
    jwt.verifyAsync.mockResolvedValue(payload);
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-id', email: 'person@example.com', role, isActive: true,
      emailVerifiedAt: new Date(), preferredLanguage: 'en', deletedAt: null,
    });
    prisma.refreshToken.findFirst.mockResolvedValue({ id: 'session-id' });
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer signed-token' },
    };
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
    await guard.canActivate(context);
    return request.user;
  };

  beforeEach(() => jest.clearAllMocks());

  it('uses the selected active role while retaining the database role as actualRole', async () => {
    const user = await run({ sub: 'user-id', sid: 'session-id', activeRole: UserRole.USER }, UserRole.ADMIN);
    expect(user).toMatchObject({ actualRole: UserRole.ADMIN, activeRole: UserRole.USER });
  });

  it('rejects an active role above the database role', async () => {
    await expect(run({ sub: 'user-id', sid: 'session-id', activeRole: UserRole.ADMIN }, UserRole.USER))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows pending role selection only for elevated accounts', async () => {
    await expect(run({ sub: 'user-id', sid: 'session-id', activeRole: null }, UserRole.ADMIN))
      .resolves.toMatchObject({ actualRole: UserRole.ADMIN, activeRole: null });
    await expect(run({ sub: 'user-id', sid: 'session-id', activeRole: null }, UserRole.USER))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
