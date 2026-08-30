import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service.js';
import { UsersService } from '../src/users/users.service.js';

describe('UsersService admin security', () => {
  const prismaMock = {
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

  const service = new UsersService(prismaMock as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents an admin from deactivating their own account when it would leave no active admin', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN, isActive: true, deletedAt: null });
    prismaMock.user.count.mockResolvedValue(0);

    await expect(service.setStatus('admin-1', { isActive: false }, 'admin-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('prevents non-admins from assigning admin roles', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'member-1', role: UserRole.USER, isActive: true, deletedAt: null });

    await expect(service.assignRoles('member-1', UserRole.ADMIN, 'member-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids a user from upgrading themselves to admin', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'member-1', role: UserRole.USER, isActive: true, deletedAt: null });

    await expect(service.assignRoles('member-1', UserRole.ADMIN, 'member-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects role changes for unknown users', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(service.assignRoles('missing-id', UserRole.USER, 'admin-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
