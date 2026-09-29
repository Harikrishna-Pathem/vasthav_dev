import { apiClient } from '../api/client';
import type { RegistrationMessage, RegisterUserRequest } from '../types/registration';

export async function registerUser(
  data: RegisterUserRequest,
): Promise<RegistrationMessage> {
  const response = await apiClient.post<RegistrationMessage>('/auth/register', data);
  return response.data;
}

export async function verifyRegistrationOtp(
  email: string,
  otp: string,
): Promise<RegistrationMessage> {
  const response = await apiClient.post<RegistrationMessage>(
    '/auth/register/verify-otp',
    { email, otp },
  );
  return response.data;
}

export async function resendRegistrationOtp(
  email: string,
): Promise<RegistrationMessage> {
  const response = await apiClient.post<RegistrationMessage>(
    '/auth/register/resend-otp',
    { email },
  );
  return response.data;
}
