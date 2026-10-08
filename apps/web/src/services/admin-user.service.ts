import { apiClient } from '../api/client';
import type { AdminUserList } from '../types/admin-user';

export async function listAdminUsers(query: { page: number; limit: number; search?: string }): Promise<AdminUserList> {
  const response = await apiClient.get<AdminUserList>('/users', { params: query });
  return response.data;
}

export async function assignUserConstituency(userId: string, constituencyId: string | null) {
  const response = await apiClient.patch(`/users/${userId}/constituency`, { constituencyId });
  return response.data;
}
