import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authService from './auth.service';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('./auth.service', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

function SessionRole() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Loading session</p>;
  return <p>{user?.role ?? 'Signed out'}</p>;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not trust a stored role when there are no valid session tokens', async () => {
    localStorage.setItem('vasthav_user', JSON.stringify({
      id: 'stale-id',
      email: 'stale@example.com',
      role: 'ADMIN',
    }));
    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('vasthav_user')).toBeNull();
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('replaces a stale stored role with the account returned by the API', async () => {
    const actualUser = { id: 'user-id', email: 'user@example.com', role: 'USER' as const };
    localStorage.setItem('vasthav_access_token', 'valid-access');
    localStorage.setItem('vasthav_refresh_token', 'valid-refresh');
    localStorage.setItem('vasthav_remember_me', 'true');
    localStorage.setItem('vasthav_user', JSON.stringify({ ...actualUser, role: 'ADMIN' }));
    vi.mocked(authService.getCurrentUser).mockResolvedValue(actualUser);

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('USER')).toBeInTheDocument();
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('vasthav_user') ?? '{}').role).toBe('USER');
    });
  });

  it('rotates an expired access-token session using the refresh API', async () => {
    const actualUser = { id: 'admin-id', email: 'admin@example.com', role: 'ADMIN' as const };
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

    expect(await screen.findByText('ADMIN')).toBeInTheDocument();
    expect(authService.refresh).toHaveBeenCalledWith('old-refresh');
    expect(localStorage.getItem('vasthav_access_token')).toBe('rotated-access');
    expect(localStorage.getItem('vasthav_refresh_token')).toBe('rotated-refresh');
  });

  it('clears the session when refresh-token rotation fails', async () => {
    localStorage.setItem('vasthav_access_token', 'expired-access');
    localStorage.setItem('vasthav_refresh_token', 'revoked-refresh');
    localStorage.setItem('vasthav_remember_me', 'true');
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Access token expired'));
    vi.mocked(authService.refresh).mockRejectedValue(new Error('Refresh token is invalid or expired'));

    render(<AuthProvider><SessionRole /></AuthProvider>);

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('vasthav_access_token')).toBeNull();
    expect(localStorage.getItem('vasthav_refresh_token')).toBeNull();
  });
});
