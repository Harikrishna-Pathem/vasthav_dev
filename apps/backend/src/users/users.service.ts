import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserLanguage, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  preferredLanguage: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type UserRecord = Record<string, unknown>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser<T extends UserRecord | null | undefined>(user: T): T {
    if (!user) return user;

    const { passwordHash, tokenHash, refreshToken, ...safeUser } = user as UserRecord;
    if (passwordHash !== undefined) {
      delete (safeUser as UserRecord).passwordHash;
    }
    if (tokenHash !== undefined) {
      delete (safeUser as UserRecord).tokenHash;
    }
    if (refreshToken !== undefined) {
      delete (safeUser as UserRecord).refreshToken;
    }

    return safeUser as T;
  }

  private sanitizeUsers<T extends UserRecord[]>(users: T): T {
    return users.map((user) => this.sanitizeUser(user)) as T;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findFirst({ where: { email, deletedAt: null } })) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName.trim(),
        role: dto.role ?? UserRole.USER,
        preferredLanguage: dto.preferredLanguage ?? UserLanguage.en,
      },
      select: userSelect,
    });

    return this.sanitizeUser(created);
  }

  async list(query: ListUsersQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const skip = (safePage - 1) * safeLimit;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { isActive: query.status === 'active' } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take: safeLimit, orderBy: { createdAt: 'desc' }, select: userSelect }),
      this.prisma.user.count({ where }),
    ]);

    return { page: safePage, limit: safeLimit, total, data: this.sanitizeUsers(data) };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('User not found');

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName.trim();
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const duplicate = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
        if (duplicate) throw new ConflictException('Email is already registered');
      }
      updateData.email = email;
    }

    if (dto.preferredLanguage !== undefined) {
      updateData.preferredLanguage = dto.preferredLanguage;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const updated = await this.prisma.user.update({ where: { id }, data: updateData, select: userSelect });
    return this.sanitizeUser(updated);
  }

  async setStatus(id: string, dto: UpdateUserStatusDto, actingUserId: string) {
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { ...userSelect, role: true } });
    if (!target) throw new NotFoundException('User not found');

    if (!dto.isActive && actingUserId === id) {
      const remainingAdmins = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (remainingAdmins === 0) {
        throw new ForbiddenException('At least one active administrator must remain in the system');
      }
    }

    if (!dto.isActive) {
      await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: userSelect,
    });

    return this.sanitizeUser(updated);
  }

  async assignRoles(id: string, role: UserRole, actingUserId: string) {
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new NotFoundException('User not found');

    const actingUser = await this.prisma.user.findFirst({ where: { id: actingUserId, deletedAt: null } });
    if (!actingUser) throw new ForbiddenException('Current user is not available');
    if (actingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can manage roles');
    }

    if (role === UserRole.ADMIN && actingUserId === target.id) {
      throw new ForbiddenException('You cannot assign ADMIN to yourself through the role management API');
    }

    if (actingUserId === target.id && target.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const activeAdmins = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
          deletedAt: null,
          id: { not: actingUserId },
        },
      });

      if (activeAdmins === 0) {
        throw new ForbiddenException('Removing your own ADMIN role would leave the system without an administrator');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });

    return this.sanitizeUser(updated);
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto, actingUserId: string) {
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new NotFoundException('User not found');

    const actingUser = await this.prisma.user.findFirst({ where: { id: actingUserId, deletedAt: null } });
    if (!actingUser) throw new ForbiddenException('Current user is not available');
    if (actingUser.role !== UserRole.ADMIN && actingUserId !== id) {
      throw new ForbiddenException('Only administrators can reset other user passwords');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { id, message: 'Password reset successful' };
  }
}
