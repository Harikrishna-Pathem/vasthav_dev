import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: AppConfigService) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email.toLowerCase(), deletedAt: null } });
    if (!user || !user.isActive || !user.emailVerifiedAt || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    if (dto.loginAs && dto.loginAs !== user.role) {
      throw new UnauthorizedException('The selected login role does not match this account.');
    }
    return this.issueTokens({ id: user.id, email: user.email, role: user.role });
  }
  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try { payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, { secret: this.config.refreshTokenSecret }); }
    catch { throw new UnauthorizedException('Refresh token is invalid or expired'); }
    const rotated = await this.prisma.$transaction(async (transaction) => {
      // Password resets take this same lock before revoking sessions. That orders
      // refresh rotation against reset so no new session can escape revocation.
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM users WHERE id = ${payload.sub}::uuid FOR UPDATE
      `;
      const now = new Date();
      const record = await transaction.refreshToken.findFirst({
        where: {
          id: payload.sid,
          tokenHash: this.hash(refreshToken),
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: now },
          user: { isActive: true, deletedAt: null, emailVerifiedAt: { not: null } },
        },
        include: { user: true },
      });
      if (!record) return null;

      const consumed = await transaction.refreshToken.updateMany({
        where: {
          id: record.id,
          tokenHash: this.hash(refreshToken),
          userId: record.user.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      if (consumed.count !== 1) return null;

      return this.issueTokens(
        { id: record.user.id, email: record.user.email, role: record.user.role },
        transaction,
      );
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!rotated) throw new UnauthorizedException('Refresh token is invalid or revoked');
    return rotated;
  }
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hash(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  private async issueTokens(
    user: AuthenticatedUser,
    database: Pick<Prisma.TransactionClient, 'refreshToken'> = this.prisma,
  ) {
    const session = await database.refreshToken.create({ data: { userId: user.id, tokenHash: 'pending', expiresAt: this.expiry(this.config.refreshTokenTtl) } });
    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email, role: user.role, sid: session.id, preferredLanguage: user.preferredLanguage ?? undefined };
    const refreshPayload: RefreshTokenPayload = { ...accessPayload, sid: session.id };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, { secret: this.config.accessTokenSecret, expiresIn: this.config.accessTokenTtl }),
      this.jwt.signAsync(refreshPayload, { secret: this.config.refreshTokenSecret, expiresIn: this.config.refreshTokenTtl }),
    ]);
    await database.refreshToken.update({ where: { id: session.id }, data: { tokenHash: this.hash(refreshToken) } });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: this.config.accessTokenTtl, user: { id: user.id, email: user.email, role: user.role } };
  }
  private hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
  private expiry(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    const amount = match ? Number(match[1]) : 30;
    const unit = match?.[2] ?? 'd';
    const multiplier = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return new Date(Date.now() + amount * multiplier);
  }
}
