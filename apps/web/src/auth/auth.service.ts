import { apiClient } from '../api/client';
import type { AuthUser, LoginResponse, UserRole } from './types';

export async function login(
  email: string,
  password: string,
  loginAs?: UserRole,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
    ...(loginAs ? { loginAs } : {}),
  });

  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>('/auth/me');

  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', {
    refreshToken,
  });
}

export async function refresh(refreshToken: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}
