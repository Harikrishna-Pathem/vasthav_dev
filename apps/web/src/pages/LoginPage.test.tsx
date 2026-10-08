import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../auth/AuthContext';
import type { AuthUser, UserRole } from '../auth/types';
import { LoginPage } from './LoginPage';
import '../i18n/i18n';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);
type LoginHandler = (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="current-path">{location.pathname}</p>;
}

function account(actualRole: UserRole, activeRole: UserRole | null): AuthUser {
  return {
    id: 'user-id',
    email: 'person@example.com',
    role: actualRole,
    actualRole,
    activeRole,
  };
}

function renderLogin(login: LoginHandler) {
  useAuthMock.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login,
    activateRole: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LocationDisplay />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-role" element={<p>Role selection</p>} />
        <Route path="/dashboard/user" element={<p>User dashboard</p>} />
        <Route path="/dashboard/head" element={<p>Survey Head dashboard</p>} />
        <Route path="/dashboard/admin" element={<p>Admin dashboard</p>} />
        <Route path="*" element={<p>Unexpected route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes the role dropdown and sends only email and password', async () => {
    const login = vi.fn<LoginHandler>().mockResolvedValue(account('USER', 'USER'));
    renderLogin(login);

    expect(screen.queryByLabelText('Login as')).not.toBeInTheDocument();
    fillLoginForm();

    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('person@example.com', 'correct horse battery staple', true);
  });

  it.each([
    ['SURVEYER', '/select-role'],
    ['ADMIN', '/select-role'],
  ] as const)('routes %s accounts to role selection after authentication', async (actualRole, path) => {
    const login = vi.fn<LoginHandler>().mockResolvedValue(account(actualRole, null));
    renderLogin(login);
    fillLoginForm();

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent(path));
    expect(await screen.findByText('Role selection')).toBeInTheDocument();
  });

  it('handles unexpected role data safely', async () => {
    const login = vi.fn<LoginHandler>().mockResolvedValue({
      ...account('ADMIN', null),
      actualRole: 'SUPERUSER',
    } as unknown as AuthUser);
    renderLogin(login);
    fillLoginForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('The server returned an invalid account role.');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });

  it('shows a safe authentication error for invalid credentials', async () => {
    const login = vi.fn<LoginHandler>().mockRejectedValue(new Error('Invalid email or password'));
    renderLogin(login);
    fillLoginForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });

  it('shows a loading state and prevents repeated submissions', async () => {
    let resolveLogin!: (user: AuthUser) => void;
    const login = vi.fn<LoginHandler>(() => new Promise<AuthUser>((resolve) => { resolveLogin = resolve; }));
    const { container } = renderLogin(login);
    fillLoginForm();

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Logging in...' })).toBeDisabled();
    fireEvent.submit(form!);
    expect(login).toHaveBeenCalledTimes(1);

    resolveLogin(account('USER', 'USER'));
    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
  });
});
