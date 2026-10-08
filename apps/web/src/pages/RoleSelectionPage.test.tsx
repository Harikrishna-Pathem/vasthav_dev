import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../auth/AuthContext';
import type { AuthUser, UserRole } from '../auth/types';
import { RoleSelectionPage } from './RoleSelectionPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

function LocationDisplay() {
  return <p data-testid="current-path">{useLocation().pathname}</p>;
}

function renderRoleSelection(actualRole: UserRole) {
  const user: AuthUser = {
    id: 'user-id',
    email: 'person@example.com',
    role: actualRole,
    actualRole,
    activeRole: null,
  };
  const activateRole = vi.fn(async (activeRole: UserRole) => ({ ...user, activeRole }));
  useAuthMock.mockReturnValue({
    user,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    activateRole,
    logout: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/select-role']}>
      <LocationDisplay />
      <Routes>
        <Route path="/select-role" element={<RoleSelectionPage />} />
        <Route path="/dashboard/user" element={<p>User dashboard</p>} />
        <Route path="/dashboard/head" element={<p>Survey Head dashboard</p>} />
        <Route path="/dashboard/admin" element={<p>Admin dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );

  return activateRole;
}

describe('RoleSelectionPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows exactly the two allowed cards to SURVEYER', () => {
    renderRoleSelection('SURVEYER');
    expect(screen.getAllByRole('button', { name: /^Continue as / })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Continue as Survey Head' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as User' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue as Admin' })).not.toBeInTheDocument();
  });

  it('shows exactly the three allowed cards to ADMIN', () => {
    renderRoleSelection('ADMIN');
    expect(screen.getAllByRole('button', { name: /^Continue as / })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Continue as Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as Survey Head' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as User' })).toBeInTheDocument();
  });

  it.each([
    ['ADMIN', 'Admin', '/dashboard/admin'],
    ['SURVEYER', 'Survey Head', '/dashboard/head'],
  ] as const)('activates %s and navigates to its dashboard', async (actualRole, title, path) => {
    const activateRole = renderRoleSelection(actualRole);
    fireEvent.click(screen.getByRole('button', { name: `Continue as ${title}` }));

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent(path));
    expect(activateRole).toHaveBeenCalledWith(actualRole);
  });

  it('navigates SURVEYER to the user dashboard when User is selected', async () => {
    const activateRole = renderRoleSelection('SURVEYER');
    fireEvent.click(screen.getByRole('button', { name: 'Continue as User' }));

    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
    expect(activateRole).toHaveBeenCalledWith('USER');
  });

  it('navigates ADMIN to the user dashboard when User is selected', async () => {
    const activateRole = renderRoleSelection('ADMIN');
    fireEvent.click(screen.getByRole('button', { name: 'Continue as User' }));

    expect(await screen.findByText('User dashboard')).toBeInTheDocument();
    expect(activateRole).toHaveBeenCalledWith('USER');
  });
});
