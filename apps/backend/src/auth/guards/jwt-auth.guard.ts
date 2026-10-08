import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserLanguage } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AccessTokenPayload, AuthenticatedUser } from '../auth.types.js';
import { getInitialActiveRole, isActiveRoleAllowed } from '../role-hierarchy.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthenticatedUser }>();
    const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Authentication is required');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: this.config.accessTokenSecret });
      if (!payload.sid) {
        throw new UnauthorizedException('Access token session is invalid');
      }
      const user = await this.prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null } });

      if (!user || !user.isActive || !user.emailVerifiedAt) {
        throw new UnauthorizedException('Account is inactive, unverified, or no longer available');
      }

      const session = await this.prisma.refreshToken.findFirst({
        where: {
          id: payload.sid,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!session) throw new UnauthorizedException('Access token session is invalid or revoked');

      const activeRole = payload.activeRole === undefined
        ? getInitialActiveRole(user.role)
        : payload.activeRole;
      if (activeRole === null ? user.role === 'USER' : !isActiveRoleAllowed(user.role, activeRole)) {
        throw new UnauthorizedException('Access token role is invalid');
      }

      request.user = {
        id: user.id,
        email: user.email,
        actualRole: user.role,
        activeRole,
        sessionId: payload.sid,
        preferredLanguage: (payload.preferredLanguage ?? user.preferredLanguage ?? UserLanguage.en) as UserLanguage,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
