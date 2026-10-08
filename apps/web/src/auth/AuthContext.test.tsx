import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authService from './auth.service';
import { AuthProvider, useAuth } from './AuthContext';
import type { AuthUser } from './types';

vi.mock('./auth.service', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  activateRole: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

function account(actualRole: 'ADMIN' | 'SURVEYER' | 'USER', activeRole: 'ADMIN' | 'SURVEYER' | 'USER' | null) {
  return { id: 'user-id', email: 'user@example.com', role: actualRole, actualRole, activeRole } as const;
}

function SessionRole() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Loading session</p>;
  return <p>{user?.activeRole ?? (user ? 'Role selection' : 'Signed out')}</p>;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not trust a stored role when there are no valid session tokens', async () => {
    localStorage.setItem('vasthav_user', JSON.stringify({
      id: 'stale-id', email: 'stale@example.com', role: 'ADMIN', actualRole: 'ADMIN', activeRole: 'ADMIN',
    }));
    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('vasthav_user')).toBeNull();
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('restores the selected active role from the authenticated API response', async () => {
    const actualUser = account('ADMIN', 'SURVEYER');
    localStorage.setItem('vasthav_access_token', 'valid-access');
    localStorage.setItem('vasthav_refresh_token', 'valid-refresh');
    localStorage.setItem('vasthav_remember_me', 'true');
    localStorage.setItem('vasthav_user', JSON.stringify({ ...actualUser, activeRole: 'USER' }));
    vi.mocked(authService.getCurrentUser).mockResolvedValue(actualUser);

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('SURVEYER')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('vasthav_user') ?? '{}').activeRole).toBe('SURVEYER');
  });

  it('rotates a refresh session while preserving its active role', async () => {
    const actualUser = account('ADMIN', 'USER');
    localStorage.setItem('vasthav_access_token', 'expired-access');
    localStorage.setItem('vasthav_refresh_token', 'old-refresh');
    localStorage.setItem('vasthav_remember_me', 'true');
    vi.mocked(authService.getCurrentUser)
      .mockRejectedValueOnce(new Error('Access token expired'))
      .mockResolvedValueOnce(actualUser);
    vi.mocked(authService.refresh).mockResolvedValue({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: actualUser,
    });

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('USER')).toBeInTheDocument();
    expect(authService.refresh).toHaveBeenCalledWith('old-refresh');
    expect(JSON.parse(localStorage.getItem('vasthav_user') ?? '{}').activeRole).toBe('USER');
    expect(localStorage.getItem('vasthav_access_token')).toBe('rotated-access');
  });

  it('keeps tokens rotated by the API interceptor during session restoration', async () => {
    const actualUser = account('ADMIN', 'ADMIN');
    localStorage.setItem('vasthav_access_token', 'old-access');
    localStorage.setItem('vasthav_refresh_token', 'old-refresh');
    localStorage.setItem('vasthav_remember_me', 'true');
    vi.mocked(authService.getCurrentUser).mockImplementation(async () => {
      localStorage.setItem('vasthav_access_token', 'interceptor-access');
      localStorage.setItem('vasthav_refresh_token', 'interceptor-refresh');
      return actualUser;
    });

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('ADMIN')).toBeInTheDocument();
    expect(localStorage.getItem('vasthav_access_token')).toBe('interceptor-access');
    expect(localStorage.getItem('vasthav_refresh_token')).toBe('interceptor-refresh');
  });

  it('clears the session when refresh fails', async () => {
    localStorage.setItem('vasthav_access_token', 'expired-access');
    localStorage.setItem('vasthav_refresh_token', 'revoked-refresh');
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Access token expired'));
    vi.mocked(authService.refresh).mockRejectedValue(new Error('Refresh token is invalid or expired'));

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('vasthav_access_token')).toBeNull();
    expect(localStorage.getItem('vasthav_refresh_token')).toBeNull();
  });

  it('rejects unexpected role data returned by the authenticated API', async () => {
    localStorage.setItem('vasthav_access_token', 'valid-access');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      ...account('ADMIN', 'ADMIN'),
      actualRole: 'ROOT',
    } as unknown as AuthUser);

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('vasthav_access_token')).toBeNull();
  });
});
