import { UserLanguage, UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  preferredLanguage?: UserLanguage;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  preferredLanguage?: UserLanguage;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  sid: string;
}
