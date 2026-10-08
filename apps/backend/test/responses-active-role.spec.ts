import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { ResponsesService } from '../src/responses/responses.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import type { AuthenticatedUser } from '../src/auth/auth.types.js';

describe('ResponsesService active role', () => {
  const prismaMock = { survey: { findFirst: jest.fn() } };
  const service = new ResponsesService(prismaMock as unknown as PrismaService);
  const dto = { surveyId: 'survey-id', answers: [] };

  const sessionUser = (actualRole: UserRole, activeRole: UserRole | null): AuthenticatedUser => ({
    id: 'user-id',
    email: 'user@example.com',
    actualRole,
    activeRole,
    sessionId: 'session-id',
  });

  beforeEach(() => jest.clearAllMocks());

  it('requires the User active role to submit a response', async () => {
    await expect(service.submit(dto, sessionUser(UserRole.ADMIN, UserRole.ADMIN)))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.submit(dto, sessionUser(UserRole.SURVEYER, UserRole.SURVEYER)))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.survey.findFirst).not.toHaveBeenCalled();
  });

  it('allows elevated accounts to submit only after activating User', async () => {
    prismaMock.survey.findFirst.mockResolvedValue(null);
    await expect(service.submit(dto, sessionUser(UserRole.ADMIN, UserRole.USER)))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.survey.findFirst).toHaveBeenCalledTimes(1);
  });
});
