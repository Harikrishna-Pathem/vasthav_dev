import { apiClient } from '../api/client';
import type { AuthUser, LoginResponse, UserRole } from './types';

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
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

export async function activateRole(activeRole: UserRole): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/active-role', { activeRole });
  return response.data;
}

export async function refresh(refreshToken: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/password-reset/request', { email });
  return response.data;
}

export async function verifyPasswordResetOtp(
  email: string,
  otp: string,
): Promise<{ message: string; resetToken: string }> {
  const response = await apiClient.post<{ message: string; resetToken: string }>(
    '/auth/password-reset/verify',
    { email, otp },
  );
  return response.data;
}

export async function resetPassword(
  resetToken: string,
  newPassword: string,
  confirmNewPassword: string,
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/password-reset/reset', {
    resetToken,
    newPassword,
    confirmNewPassword,
  });
  return response.data;
}
