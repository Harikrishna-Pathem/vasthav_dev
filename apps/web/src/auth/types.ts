export type UserRole = 'ADMIN' | 'SURVEYER' | 'USER';

export const dashboardPathByRole: Record<UserRole, string> = {
  USER: '/dashboard/user',
  SURVEYER: '/dashboard/head',
  ADMIN: '/dashboard/admin',
};

export function isUserRole(value: unknown): value is UserRole {
  return value === 'ADMIN' || value === 'SURVEYER' || value === 'USER';
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
}
