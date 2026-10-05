import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getRememberMe,
  saveSession,
} from '../auth/auth.storage';
import { isUserRole, type LoginResponse } from '../auth/types';

type RetryableRequest = InternalAxiosRequestConfig & { _vasthavRetried?: boolean };

let refreshRequest: Promise<string> | null = null;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new Error('Request failed'));
    }

    const message =
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      'Request failed';

    const request = error.config as RetryableRequest | undefined;
    const isAuthRequest = /\/auth\/(login|refresh|logout)$/.test(request?.url ?? '');

    if (error.response?.status === 401 && request && !isAuthRequest) {
      const refreshToken = getRefreshToken();

      if (!request._vasthavRetried && refreshToken) {
        request._vasthavRetried = true;
        try {
          refreshRequest ??= apiClient
            .post<LoginResponse>('/auth/refresh', { refreshToken })
            .then(({ data }) => {
              if (!data.accessToken || !data.refreshToken || !isUserRole(data.user?.role)) {
                throw new Error('The session could not be refreshed.');
              }
              saveSession(data.accessToken, data.refreshToken, data.user, getRememberMe());
              return data.accessToken;
            })
            .finally(() => {
              refreshRequest = null;
            });

          const accessToken = await refreshRequest;
          request.headers.Authorization = `Bearer ${accessToken}`;
          return await apiClient(request);
        } catch {
          clearSession();
          window.dispatchEvent(new Event('vasthav:session-expired'));
        }
      } else if (request._vasthavRetried || !refreshToken) {
        clearSession();
        window.dispatchEvent(new Event('vasthav:session-expired'));
      }
    }

    return Promise.reject(new Error(message));
  },
);
