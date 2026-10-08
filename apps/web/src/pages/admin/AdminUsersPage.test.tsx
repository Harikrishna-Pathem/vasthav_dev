import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assignUserConstituency, listAdminUsers } from '../../services/admin-user.service';
import { listConstituencies } from '../../services/constituency.service';
import { AdminUsersPage } from './AdminUsersPage';

vi.mock('../../services/admin-user.service', () => ({ assignUserConstituency: vi.fn(), listAdminUsers: vi.fn() }));
vi.mock('../../services/constituency.service', () => ({ listConstituencies: vi.fn() }));

const listUsersMock = vi.mocked(listAdminUsers);

describe('AdminUsersPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    listUsersMock.mockResolvedValue({
      page: 1,
      limit: 10,
      total: 1,
      data: [{
        id: 'user-id',
        email: 'user@example.com',
        displayName: 'Example User',
        role: 'USER',
        preferredLanguage: 'en',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        constituency: { id: 'old-id', name: 'Old Area', isActive: false },
      }],
    });
    vi.mocked(listConstituencies).mockResolvedValue([{ id: 'active-id', name: 'Active Area' }]);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('displays the current assignment and offers only public active constituencies', async () => {
    render(<AdminUsersPage />);
    expect(await screen.findByText('Old Area')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    const select = screen.getByLabelText('Assign active constituency to Example User');
    expect(screen.getByRole('option', { name: 'Active Area' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Old Area' })).not.toBeInTheDocument();
    expect(select).toBeEnabled();
  });

  it('assigns a new active constituency', async () => {
    render(<AdminUsersPage />);
    const select = await screen.findByLabelText('Assign active constituency to Example User');
    fireEvent.change(select, { target: { value: 'active-id' } });
    await waitFor(() => expect(assignUserConstituency).toHaveBeenCalledWith('user-id', 'active-id'));
  });

  it('removes an existing assignment', async () => {
    render(<AdminUsersPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(assignUserConstituency).toHaveBeenCalledWith('user-id', null));
  });

  it('loads users and displays an empty state', async () => {
    listUsersMock.mockResolvedValue({ page: 1, limit: 10, total: 0, data: [] });
    render(<AdminUsersPage />);
    expect(await screen.findByText('No users found')).toBeInTheDocument();
  });
});
