import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service.js';
import { ConstituenciesService } from '../src/constituencies/constituencies.service.js';

describe('ConstituenciesService', () => {
  const transactionMock = {
    $queryRaw: jest.fn(),
    constituency: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const prismaMock = {
    ...transactionMock,
    $transaction: jest.fn(),
  };
  const service = new ConstituenciesService(prismaMock as unknown as PrismaService);
  const id = '22222222-2222-4222-8222-222222222222';
  const item = { id, name: 'Karimnagar', isActive: true, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.$queryRaw.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation((operation: unknown) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      if (typeof operation === 'function') return operation(transactionMock);
      throw new Error('Unexpected transaction operation');
    });
  });

  it('lists active constituencies publicly in alphabetical order', async () => {
    prismaMock.constituency.findMany.mockResolvedValue([item]);
    await expect(service.list()).resolves.toEqual([item]);
    expect(prismaMock.constituency.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });

  it('paginates, searches, filters, and returns non-deleted assigned user counts', async () => {
    transactionMock.constituency.findMany.mockResolvedValue([{ ...item, _count: { users: 3 } }]);
    transactionMock.constituency.count.mockResolvedValue(1);
    await expect(service.listManage({ page: 2, limit: 10, search: ' kara ', status: 'inactive' })).resolves.toMatchObject({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
      items: [{ id, assignedUserCount: 3 }],
    });
    expect(transactionMock.constituency.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: { contains: 'kara', mode: 'insensitive' }, isActive: false },
      skip: 10,
      take: 10,
    }));
  });

  it('creates a trimmed name and reports duplicate names case-insensitively', async () => {
    transactionMock.constituency.findFirst.mockResolvedValue(null);
    transactionMock.constituency.create.mockResolvedValue(item);
    await expect(service.create({ name: '  Karimnagar  ' })).resolves.toMatchObject({ name: 'Karimnagar', assignedUserCount: 0 });
    expect(transactionMock.constituency.create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Karimnagar' } }));
    expect(transactionMock.$queryRaw).toHaveBeenCalledTimes(1);

    transactionMock.constituency.findFirst.mockResolvedValue({ id });
    await expect(service.create({ name: 'KARIMNAGAR' })).rejects.toBeInstanceOf(ConflictException);
    expect(transactionMock.constituency.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { name: { equals: 'KARIMNAGAR', mode: 'insensitive' } },
    }));
  });

  it('maps a unique-constraint race to conflict', async () => {
    transactionMock.constituency.findFirst.mockResolvedValue(null);
    transactionMock.constituency.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique conflict', {
      code: 'P2002',
      clientVersion: 'test',
    }));
    await expect(service.create({ name: 'Karimnagar' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates the name and returns 404 for a missing record', async () => {
    transactionMock.constituency.findUnique
      .mockResolvedValueOnce({ id })
      .mockResolvedValueOnce({ ...item, name: 'Updated', _count: { users: 2 } });
    transactionMock.constituency.findFirst.mockResolvedValue(null);
    transactionMock.constituency.update.mockResolvedValue({ ...item, name: 'Updated' });
    await expect(service.update(id, { name: ' Updated ' })).resolves.toMatchObject({ name: 'Updated', assignedUserCount: 2 });
    expect(transactionMock.constituency.update).toHaveBeenCalledWith({ where: { id }, data: { name: 'Updated' } });

    transactionMock.constituency.findUnique.mockResolvedValue(null);
    await expect(service.update(id, { name: 'Updated' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects case-insensitive duplicate names when updating', async () => {
    transactionMock.constituency.findUnique.mockResolvedValue({ id });
    transactionMock.constituency.findFirst.mockResolvedValue({ id: 'another-id' });
    await expect(service.update(id, { name: ' karimnagar ' })).rejects.toBeInstanceOf(ConflictException);
    expect(transactionMock.constituency.update).not.toHaveBeenCalled();
  });

  it.each([false, true])('changes status to %s without deleting user assignments', async (isActive) => {
    transactionMock.constituency.findUnique
      .mockResolvedValueOnce({ id })
      .mockResolvedValueOnce({ ...item, isActive, _count: { users: 2 } });
    transactionMock.constituency.update.mockResolvedValue({ ...item, isActive });
    await expect(service.updateStatus(id, { isActive })).resolves.toMatchObject({ isActive, assignedUserCount: 2 });
    expect(transactionMock.constituency.update).toHaveBeenCalledWith({ where: { id }, data: { isActive } });
  });

  it('returns 404 for a missing constituency', async () => {
    prismaMock.constituency.findUnique.mockResolvedValue(null);
    await expect(service.getById(id)).rejects.toBeInstanceOf(NotFoundException);
    transactionMock.constituency.findUnique.mockResolvedValue(null);
    await expect(service.updateStatus(id, { isActive: false })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns details with the assigned user count', async () => {
    prismaMock.constituency.findUnique.mockResolvedValue({ ...item, _count: { users: 7 } });
    await expect(service.getById(id)).resolves.toMatchObject({ id, assignedUserCount: 7 });
  });
});
