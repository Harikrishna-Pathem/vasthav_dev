import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from './auth/AuthContext';
import type { AuthUser, UserRole } from './auth/types';
import { listAdminUsers } from './services/admin-user.service';
import { listManagedConstituencies } from './services/constituency.service';
import { App } from './App';
import './i18n/i18n';

vi.mock('./auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: vi.fn(),
}));
vi.mock('./services/admin-user.service', () => ({ listAdminUsers: vi.fn() }));
vi.mock('./services/constituency.service', () => ({ listManagedConstituencies: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

function authState(actualRole: UserRole, activeRole: UserRole): AuthUser {
  return {
    id: 'user-id',
    email: 'person@example.com',
    actualRole,
    activeRole,
    role: actualRole,
  };
}

function renderAt(path: string, user: AuthUser) {
  window.history.pushState({}, '', path);
  useAuthMock.mockReturnValue({
    user,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    activateRole: vi.fn(),
    logout: vi.fn(),
  });
  return render(<App />);
}

describe('dashboard routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAdminUsers).mockResolvedValue({ page: 1, limit: 1, total: 0, data: [] });
    vi.mocked(listManagedConstituencies).mockResolvedValue({ page: 1, limit: 1, total: 0, totalPages: 0, items: [] });
  });

  it('renders the Admin dashboard at its protected route', async () => {
    renderAt('/dashboard/admin', authState('ADMIN', 'ADMIN'));
    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Survey Head Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User Dashboard' })).not.toBeInTheDocument();
  });

  it('renders the Survey Head dashboard at its protected route', async () => {
    renderAt('/dashboard/head', authState('SURVEYER', 'SURVEYER'));
    expect(await screen.findByRole('heading', { name: 'Survey Head Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User Dashboard' })).not.toBeInTheDocument();
  });

  it('renders the User dashboard at its protected route', async () => {
    renderAt('/dashboard/user', authState('USER', 'USER'));
    expect(await screen.findByRole('heading', { name: 'User Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Survey Head Dashboard' })).not.toBeInTheDocument();
  });

  it('redirects an Admin using the User active role to the User dashboard', async () => {
    renderAt('/dashboard/admin', authState('ADMIN', 'USER'));
    expect(await screen.findByRole('heading', { name: 'User Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin Dashboard' })).not.toBeInTheDocument();
  });
});
