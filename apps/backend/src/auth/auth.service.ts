import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: AppConfigService) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email.toLowerCase(), deletedAt: null } });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.issueTokens({ id: user.id, email: user.email, role: user.role });
  }
  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try { payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, { secret: this.config.refreshTokenSecret }); }
    catch { throw new UnauthorizedException('Refresh token is invalid or expired'); }
    const record = await this.prisma.refreshToken.findFirst({ where: { id: payload.sid, tokenHash: this.hash(refreshToken), userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true, deletedAt: null } }, include: { user: true } });
    if (!record) throw new UnauthorizedException('Refresh token is invalid or revoked');
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokens({ id: record.user.id, email: record.user.email, role: record.user.role });
  }
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hash(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  private async issueTokens(user: AuthenticatedUser) {
    const session = await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: 'pending', expiresAt: this.expiry(this.config.refreshTokenTtl) } });
    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload: RefreshTokenPayload = { ...accessPayload, sid: session.id };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, { secret: this.config.accessTokenSecret, expiresIn: this.config.accessTokenTtl }),
      this.jwt.signAsync(refreshPayload, { secret: this.config.refreshTokenSecret, expiresIn: this.config.refreshTokenTtl }),
    ]);
    await this.prisma.refreshToken.update({ where: { id: session.id }, data: { tokenHash: this.hash(refreshToken) } });
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
