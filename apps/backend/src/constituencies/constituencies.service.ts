import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ConstituenciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.constituency.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
