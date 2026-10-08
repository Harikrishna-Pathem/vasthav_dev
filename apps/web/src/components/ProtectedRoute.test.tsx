import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../auth/AuthContext';
import type { AuthUser } from '../auth/types';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

function renderRoleRoute(user: AuthUser | null, initialPath = '/dashboard/admin') {
  useAuthMock.mockReturnValue({
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    login: vi.fn(),
    activateRole: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/dashboard/admin" element={<p>Admin dashboard</p>} />
            <Route path="/admin/users" element={<p>Admin users</p>} />
          </Route>
          <Route path="/dashboard/user" element={<p>User dashboard</p>} />
        </Route>
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects users away from routes reserved for another role', async () => {
    renderRoleRoute({ id: 'user-id', email: 'user@example.com', role: 'USER', actualRole: 'USER', activeRole: 'USER' });
    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated visits to login', async () => {
    renderRoleRoute(null);
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('blocks an ADMIN account using the USER active role from admin management routes', async () => {
    renderRoleRoute({ id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', actualRole: 'ADMIN', activeRole: 'USER' }, '/admin/users');
    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin users')).not.toBeInTheDocument();
  });
});
