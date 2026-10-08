import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service.js';
import { UsersService } from '../src/users/users.service.js';

describe('UsersService constituency assignment', () => {
  const transactionMock = {
    $queryRaw: jest.fn(),
    user: { findFirst: jest.fn(), update: jest.fn() },
    constituency: { findUnique: jest.fn() },
  };
  const prismaMock = {
    ...transactionMock,
    $transaction: jest.fn(),
  };
  const service = new UsersService(prismaMock as unknown as PrismaService);
  const userId = '33333333-3333-4333-8333-333333333333';
  const constituencyId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.$queryRaw.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation((operation: unknown) => {
      if (typeof operation === 'function') return operation(transactionMock);
      throw new Error('Expected callback transaction');
    });
    transactionMock.user.findFirst.mockResolvedValue({ id: userId });
    transactionMock.constituency.findUnique.mockResolvedValue({ id: constituencyId, isActive: true });
    transactionMock.user.update.mockResolvedValue({
      id: userId,
      email: 'member@example.com',
      constituency: { id: constituencyId, name: 'Karimnagar', isActive: true },
    });
  });

  it('assigns an active constituency and selects only safe user fields', async () => {
    await expect(service.assignConstituency(userId, constituencyId)).resolves.toMatchObject({
      id: userId,
      constituency: { id: constituencyId, name: 'Karimnagar' },
    });
    expect(transactionMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: userId },
      data: { constituencyId },
      select: expect.objectContaining({
        id: true,
        email: true,
        constituency: { select: { id: true, name: true, isActive: true } },
      }),
    }));
    const select = transactionMock.user.update.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('passwordHash');
    expect(select).not.toHaveProperty('refreshTokens');
  });

  it('removes an existing constituency assignment with null', async () => {
    await service.assignConstituency(userId, null);
    expect(transactionMock.constituency.findUnique).not.toHaveBeenCalled();
    expect(transactionMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { constituencyId: null } }));
  });

  it('rejects an inactive constituency', async () => {
    transactionMock.constituency.findUnique.mockResolvedValue({ id: constituencyId, isActive: false });
    await expect(service.assignConstituency(userId, constituencyId)).rejects.toBeInstanceOf(ConflictException);
    expect(transactionMock.user.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the user or constituency does not exist', async () => {
    transactionMock.user.findFirst.mockResolvedValue(null);
    await expect(service.assignConstituency(userId, constituencyId)).rejects.toBeInstanceOf(NotFoundException);

    transactionMock.user.findFirst.mockResolvedValue({ id: userId });
    transactionMock.constituency.findUnique.mockResolvedValue(null);
    await expect(service.assignConstituency(userId, constituencyId)).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionMock.user.update).not.toHaveBeenCalled();
  });
});
