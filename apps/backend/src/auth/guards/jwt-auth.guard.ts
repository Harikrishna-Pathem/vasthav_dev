import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserLanguage } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AccessTokenPayload, AuthenticatedUser } from '../auth.types.js';

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
      const user = await this.prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null } });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Account is inactive or no longer available');
      }

      request.user = { id: user.id, email: user.email, role: user.role, preferredLanguage: (payload.preferredLanguage ?? user.preferredLanguage ?? UserLanguage.en) as UserLanguage };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
