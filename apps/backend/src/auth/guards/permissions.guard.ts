import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Permission, PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { AuthenticatedUser } from '../auth.types.js';

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    Permission.UserManage,
    Permission.UserRead,
    Permission.SurveyRead,
    Permission.SurveyWrite,
    Permission.QuestionRead,
    Permission.QuestionWrite,
    Permission.AssignmentRead,
    Permission.AssignmentWrite,
  ],
  SURVEYER: [
    Permission.SurveyRead,
    Permission.SurveyWrite,
    Permission.QuestionRead,
    Permission.QuestionWrite,
    Permission.AssignmentRead,
    Permission.AssignmentWrite,
  ],
  USER: [Permission.AssignmentRead],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user) throw new ForbiddenException('Authentication required to evaluate permissions');

    const allowed = rolePermissions[user.role] ?? [];
    if (!required.every((permission) => allowed.includes(permission))) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}
