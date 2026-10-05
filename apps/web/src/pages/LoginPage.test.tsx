import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../auth/AuthContext';
import type { AuthUser, UserRole } from '../auth/types';
import { LoginPage } from './LoginPage';
import '../i18n/i18n';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);
type LoginHandler = (
  email: string,
  password: string,
  loginAs: UserRole,
  rememberMe?: boolean,
) => Promise<AuthUser>;

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="current-path">{location.pathname}</p>;
}

function renderLogin(login: LoginHandler) {
  useAuthMock.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login,
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LocationDisplay />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<p>Unexpected route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillLoginForm(role: UserRole) {
  fireEvent.change(screen.getByLabelText('Login as'), { target: { value: role } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['USER', '/dashboard/user'],
    ['SURVEYER', '/dashboard/head'],
    ['ADMIN', '/dashboard/admin'],
  ] as const)('submits login mode %s and redirects from the returned role', async (loginAs, path) => {
    const actualUser: AuthUser = {
      id: 'user-id',
      email: 'person@example.com',
      role: loginAs,
    };
    const login = vi.fn<LoginHandler>().mockResolvedValue(actualUser);
    renderLogin(login);

    fillLoginForm(loginAs);

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent(path));
    expect(login).toHaveBeenCalledWith('person@example.com', 'correct horse battery staple', loginAs, true);
  });

  it('uses the authenticated role returned by the API for the redirect', async () => {
    const login = vi.fn<LoginHandler>().mockResolvedValue({
      id: 'admin-id',
      email: 'person@example.com',
      role: 'ADMIN',
    });
    renderLogin(login);
    fillLoginForm('USER');

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard/admin'));
  });

  it('shows a safe role mismatch message from the authentication API', async () => {
    const login = vi.fn<LoginHandler>().mockRejectedValue(new Error('The selected login role does not match this account.'));
    renderLogin(login);
    fillLoginForm('ADMIN');

    expect(await screen.findByRole('alert')).toHaveTextContent('The selected login role does not match this account.');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });

  it('shows a generic authentication error for invalid credentials', async () => {
    const login = vi.fn<LoginHandler>().mockRejectedValue(new Error('Invalid email or password'));
    renderLogin(login);
    fillLoginForm('USER');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });

  it('shows a loading state and prevents repeated submissions', async () => {
    let resolveLogin!: (user: AuthUser) => void;
    const login = vi.fn<LoginHandler>(() => new Promise<AuthUser>((resolve) => { resolveLogin = resolve; }));
    const { container } = renderLogin(login);
    fillLoginForm('USER');

    const submit = container.querySelector('form');
    expect(submit).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Logging in...' })).toBeDisabled();
    fireEvent.submit(submit!);
    expect(login).toHaveBeenCalledTimes(1);

    resolveLogin({ id: 'user-id', email: 'person@example.com', role: 'USER' });
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard/user'));
  });
});
