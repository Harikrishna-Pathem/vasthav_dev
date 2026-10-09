import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { listAdminUsers } from '../../services/admin-user.service';
import { listManagedConstituencies } from '../../services/constituency.service';
import type { AdminUserList } from '../../types/admin-user';
import type { ManagedConstituencyList } from '../../types/constituency';
import { AdminDashboardPage } from './AdminDashboardPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../services/admin-user.service', () => ({ listAdminUsers: vi.fn() }));
vi.mock('../../services/constituency.service', () => ({ listManagedConstituencies: vi.fn() }));

const usersMock = vi.mocked(listAdminUsers);
const constituenciesMock = vi.mocked(listManagedConstituencies);

function renderPage() {
  return render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', actualRole: 'ADMIN', activeRole: 'ADMIN' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      activateRole: vi.fn(),
      logout: vi.fn(),
    });
    usersMock.mockResolvedValue({ page: 1, limit: 1, total: 12, data: [] });
    constituenciesMock.mockResolvedValue({ page: 1, limit: 1, total: 4, totalPages: 4, items: [] });
  });

  it('shows the admin welcome, real summary counts, and management links', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, admin@example.com/)).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage users/ })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /Manage constituencies/ })).toHaveAttribute('href', '/admin/constituencies');
    expect(usersMock).toHaveBeenCalledWith({ page: 1, limit: 1 });
    expect(constituenciesMock).toHaveBeenCalledWith({ page: 1, limit: 1 });
    expect(screen.queryByText('Translations')).not.toBeInTheDocument();
  });

  it('shows a loading state until both summaries resolve', async () => {
    let resolveUsers!: (value: AdminUserList) => void;
    let resolveConstituencies!: (value: ManagedConstituencyList) => void;
    usersMock.mockReturnValueOnce(new Promise<AdminUserList>((resolve) => { resolveUsers = resolve; }));
    constituenciesMock.mockReturnValueOnce(new Promise<ManagedConstituencyList>((resolve) => { resolveConstituencies = resolve; }));

    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard summaries');
    await act(async () => {
      resolveUsers({ page: 1, limit: 1, total: 2, data: [] });
      resolveConstituencies({ page: 1, limit: 1, total: 1, totalPages: 1, items: [] });
    });
    expect(await screen.findByText('Total users')).toBeInTheDocument();
  });

  it('shows a recoverable request error', async () => {
    usersMock.mockRejectedValueOnce(new Error('network detail'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load dashboard summaries');
    expect(screen.queryByText('network detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  it('shows valid zero counts and empty summaries', async () => {
    usersMock.mockResolvedValueOnce({ page: 1, limit: 1, total: 0, data: [] });
    constituenciesMock.mockResolvedValueOnce({ page: 1, limit: 1, total: 0, totalPages: 0, items: [] });
    renderPage();

    expect(await screen.findByText('No user accounts yet.')).toBeInTheDocument();
    expect(screen.getByText('No constituencies yet.')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });
});
