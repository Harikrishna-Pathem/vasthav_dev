import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConstituency, listManagedConstituencies, setConstituencyActive, updateConstituency } from '../../services/constituency.service';
import type { ManagedConstituencyList } from '../../types/constituency';
import { AdminConstituenciesPage } from './AdminConstituenciesPage';

vi.mock('../../services/constituency.service', () => ({
  createConstituency: vi.fn(),
  listManagedConstituencies: vi.fn(),
  setConstituencyActive: vi.fn(),
  updateConstituency: vi.fn(),
}));

const listMock = vi.mocked(listManagedConstituencies);
const nameId = 'constituency-id';
const result = (items: ManagedConstituencyList['items'] = []): ManagedConstituencyList => ({
  page: 1,
  limit: 10,
  total: items.length,
  totalPages: 1,
  items,
});
const activeItem = {
  id: nameId,
  name: 'Karimnagar',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  assignedUserCount: 4,
};

describe('AdminConstituenciesPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue(result([activeItem]));
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('shows a loading state while the list is loading', async () => {
    let resolve: ((value: ManagedConstituencyList) => void) | undefined;
    listMock.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<AdminConstituenciesPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading constituencies');
    resolve?.(result());
    await waitFor(() => expect(screen.getByText('No constituencies found')).toBeInTheDocument());
  });

  it('shows an empty state', async () => {
    listMock.mockResolvedValue(result());
    render(<AdminConstituenciesPage />);
    expect(await screen.findByText('No constituencies found')).toBeInTheDocument();
  });

  it('shows a recoverable error when the management list cannot load', async () => {
    listMock.mockRejectedValueOnce(new Error('Network unavailable'));
    render(<AdminConstituenciesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  });

  it('creates a constituency and refreshes the list', async () => {
    render(<AdminConstituenciesPage />);
    await screen.findByText('Karimnagar');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Warangal ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add constituency' }));
    await waitFor(() => expect(createConstituency).toHaveBeenCalledWith('Warangal'));
    expect(await screen.findByText('Constituency created.')).toBeInTheDocument();
  });

  it('updates a constituency name', async () => {
    render(<AdminConstituenciesPage />);
    await screen.findByText('Karimnagar');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateConstituency).toHaveBeenCalledWith(nameId, 'Updated Name'));
  });

  it('confirms and toggles active status', async () => {
    render(<AdminConstituenciesPage />);
    await screen.findByText('Karimnagar');
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(setConstituencyActive).toHaveBeenCalledWith(nameId, false));
  });

  it('sends search and status filters to the API', async () => {
    render(<AdminConstituenciesPage />);
    await screen.findByText('Karimnagar');
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'War' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'inactive' } });
    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ page: 1, limit: 10, search: 'War', status: 'inactive' }));
  });
});
