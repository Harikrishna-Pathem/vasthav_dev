import type { UserRole } from '../auth/types';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  preferredLanguage: 'en' | 'te' | 'hi';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  constituency: { id: string; name: string; isActive: boolean } | null;
}

export interface AdminUserList {
  page: number;
  limit: number;
  total: number;
  data: AdminUser[];
}
