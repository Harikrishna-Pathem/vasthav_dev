import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findFirst({ where: { email } })) throw new ConflictException('Email is already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({ data: { email, passwordHash, displayName: dto.displayName, role: dto.role }, select: { id: true, email: true, displayName: true, role: true, isActive: true, createdAt: true } });
  }
  list() { return this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, email: true, displayName: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }
  async setActive(id: string, isActive: boolean) {
    const result = await this.prisma.user.updateMany({ where: { id, deletedAt: null }, data: { isActive } });
    if (!result.count) throw new NotFoundException('User not found');
    if (!isActive) await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { id, isActive };
  }
}
