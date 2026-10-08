import { UserRole } from '@prisma/client';

export function getAvailableActiveRoles(actualRole: UserRole): UserRole[] {
  switch (actualRole) {
    case UserRole.ADMIN:
      return [UserRole.ADMIN, UserRole.SURVEYER, UserRole.USER];
    case UserRole.SURVEYER:
      return [UserRole.SURVEYER, UserRole.USER];
    case UserRole.USER:
      return [UserRole.USER];
  }
  return [];
}

export function isActiveRoleAllowed(actualRole: UserRole, activeRole: unknown): activeRole is UserRole {
  return getAvailableActiveRoles(actualRole).some((role) => role === activeRole);
}

export function getInitialActiveRole(actualRole: UserRole): UserRole | null {
  return actualRole === UserRole.USER ? UserRole.USER : null;
}
