import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { UserDashboardPage } from './UserDashboardPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('UserDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-id', email: 'member@example.com', role: 'USER', actualRole: 'USER', activeRole: 'USER' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      activateRole: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('shows the account summary and does not imply survey discovery is available', () => {
    render(<MemoryRouter><UserDashboardPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'User Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, member@example.com/)).toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByText('Survey participation options will appear here when available.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /survey/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/available surveys/i)).not.toBeInTheDocument();
  });
});
