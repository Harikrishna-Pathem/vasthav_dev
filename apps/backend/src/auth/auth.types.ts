import { UserLanguage, UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  actualRole: UserRole;
  activeRole: UserRole | null;
  sessionId: string;
  preferredLanguage?: UserLanguage;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  actualRole: UserRole;
  /** Kept for older API consumers; authorization always uses the database role. */
  role?: UserRole;
  activeRole?: UserRole | null;
  sid: string;
  preferredLanguage?: UserLanguage;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  sid: string;
}
