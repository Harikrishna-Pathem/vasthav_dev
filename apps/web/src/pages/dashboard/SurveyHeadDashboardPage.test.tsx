import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { SurveyHeadDashboardPage } from './SurveyHeadDashboardPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('SurveyHeadDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'head-id', email: 'head@example.com', role: 'SURVEYER', actualRole: 'SURVEYER', activeRole: 'SURVEYER' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      activateRole: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('shows a distinct welcome and survey workspace link without invented metrics', () => {
    render(<MemoryRouter><SurveyHeadDashboardPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Survey Head Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, head@example.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open surveys' })).toHaveAttribute('href', '/surveys');
    expect(screen.queryByText(/total surveys/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('Translations')).not.toBeInTheDocument();
  });
});
