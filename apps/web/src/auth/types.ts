export type UserRole = 'ADMIN' | 'SURVEYER' | 'USER';

export const dashboardPathByRole: Record<UserRole, string> = {
  USER: '/dashboard/user',
  SURVEYER: '/dashboard/head',
  ADMIN: '/dashboard/admin',
};

export const activeRolesByActualRole: Record<UserRole, UserRole[]> = {
  ADMIN: ['ADMIN', 'SURVEYER', 'USER'],
  SURVEYER: ['SURVEYER', 'USER'],
  USER: ['USER'],
};

export function isUserRole(value: unknown): value is UserRole {
  return value === 'ADMIN' || value === 'SURVEYER' || value === 'USER';
}

export interface AuthUser {
  id: string;
  email: string;
  /** Actual highest role assigned in the database. */
  actualRole: UserRole;
  /** Role selected for this authenticated session; null while selection is pending. */
  activeRole: UserRole | null;
  /** Compatibility field containing the actual role. */
  role: UserRole;
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthUser>;
  if (
    typeof candidate.id !== 'string'
    || typeof candidate.email !== 'string'
    || !isUserRole(candidate.actualRole)
    || candidate.role !== candidate.actualRole
  ) return false;

  if (candidate.activeRole === null) return candidate.actualRole !== 'USER';
  return isUserRole(candidate.activeRole)
    && activeRolesByActualRole[candidate.actualRole].includes(candidate.activeRole);
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
}
