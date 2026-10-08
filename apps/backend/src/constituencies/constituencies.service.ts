import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateConstituencyDto } from './dto/create-constituency.dto.js';
import { ListConstituenciesQueryDto } from './dto/list-constituencies-query.dto.js';
import { UpdateConstituencyDto } from './dto/update-constituency.dto.js';
import { UpdateConstituencyStatusDto } from './dto/update-constituency-status.dto.js';

const constituencySelect = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const constituencyWithCountSelect = {
  ...constituencySelect,
  _count: { select: { users: { where: { deletedAt: null } } } },
} as const;

@Injectable()
export class ConstituenciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.constituency.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listManage(query: ListConstituenciesQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ConstituencyWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(query.status ? { isActive: query.status === 'active' } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.constituency.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { name: 'asc' },
        select: constituencyWithCountSelect,
      }),
      this.prisma.constituency.count({ where }),
    ]);

    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      items: items.map(({ _count, ...item }) => ({ ...item, assignedUserCount: _count.users })),
    };
  }

  async getById(id: string) {
    const item = await this.prisma.constituency.findUnique({
      where: { id },
      select: constituencyWithCountSelect,
    });
    if (!item) throw new NotFoundException('Constituency not found');
    return this.withAssignedUserCount(item);
  }

  async create(dto: CreateConstituencyDto) {
    const name = dto.name.trim();
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.lockName(transaction, name);
        await this.assertNameAvailable(transaction, name);
        const item = await transaction.constituency.create({
          data: { name },
          select: constituencySelect,
        });
        return { ...item, assignedUserCount: 0 };
      });
    } catch (error) {
      this.throwIfDuplicateName(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateConstituencyDto) {
    const name = dto.name.trim();
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.constituency.findUnique({ where: { id }, select: { id: true } });
        if (!current) throw new NotFoundException('Constituency not found');
        await this.lockName(transaction, name);
        await this.assertNameAvailable(transaction, name, id);
        await transaction.constituency.update({ where: { id }, data: { name } });
        return this.getWithCount(transaction, id);
      });
    } catch (error) {
      this.throwIfDuplicateName(error);
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateConstituencyStatusDto) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM constituencies WHERE id = ${id}::uuid FOR UPDATE
      `;
      const existing = await transaction.constituency.findUnique({ where: { id }, select: { id: true } });
      if (!existing) throw new NotFoundException('Constituency not found');
      await transaction.constituency.update({ where: { id }, data: { isActive: dto.isActive } });
      return this.getWithCount(transaction, id);
    });
  }

  private async lockName(transaction: Prisma.TransactionClient, name: string): Promise<void> {
    // Serialize case-insensitive name checks, including concurrent differently-cased writes.
    await transaction.$queryRaw<Array<{ pg_advisory_xact_lock: null }>>`
      SELECT pg_advisory_xact_lock(
        hashtext('vasthav:constituency-name'),
        hashtext(lower(${name}))
      )
    `;
  }

  private async assertNameAvailable(transaction: Prisma.TransactionClient, name: string, exceptId?: string): Promise<void> {
    const existing = await transaction.constituency.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A constituency with this name already exists');
  }

  private async getWithCount(transaction: Prisma.TransactionClient, id: string) {
    const item = await transaction.constituency.findUnique({ where: { id }, select: constituencyWithCountSelect });
    if (!item) throw new NotFoundException('Constituency not found');
    return this.withAssignedUserCount(item);
  }

  private withAssignedUserCount<T extends { _count: { users: number } }>(item: T) {
    const { _count, ...details } = item;
    return { ...details, assignedUserCount: _count.users };
  }

  private throwIfDuplicateName(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A constituency with this name already exists');
    }
  }
}
