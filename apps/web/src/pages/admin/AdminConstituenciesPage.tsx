import { useCallback, useEffect, useState, type FormEvent } from 'react';

import {
  createConstituency,
  listManagedConstituencies,
  setConstituencyActive,
  updateConstituency,
} from '../../services/constituency.service';
import type { ManagedConstituency, ManagedConstituencyList } from '../../types/constituency';

const PAGE_SIZE = 10;

export function AdminConstituenciesPage() {
  const [result, setResult] = useState<ManagedConstituencyList | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setResult(await listManagedConstituencies({
        page,
        limit: PAGE_SIZE,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load constituencies.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a constituency name.');
      return;
    }
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) {
        await updateConstituency(editingId, trimmed);
        setNotice('Constituency updated.');
      } else {
        await createConstituency(trimmed);
        setNotice('Constituency created.');
        setPage(1);
      }
      setEditingId(null);
      setName('');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save constituency.');
    } finally {
      setIsSaving(false);
    }
  }

  function beginEdit(item: ManagedConstituency) {
    setEditingId(item.id);
    setName(item.name);
    setNotice('');
    setError('');
  }

  async function toggleStatus(item: ManagedConstituency) {
    const nextActive = !item.isActive;
    const action = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${item.name}? Existing user assignments will remain unchanged.`)) return;
    setBusyId(item.id);
    setError('');
    setNotice('');
    try {
      await setConstituencyActive(item.id, nextActive);
      setNotice(`Constituency ${nextActive ? 'activated' : 'deactivated'}.`);
      await load();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update constituency status.');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(result?.totalPages ?? 1, 1);

  return (
    <div className="page-container py-8 sm:py-10">
      <header className="mb-7">
        <p className="text-sm font-semibold text-vasthav-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Constituencies</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage the active areas available for registration and user assignment.</p>
      </header>

      <section className="card mb-6 p-5 sm:p-6" aria-labelledby="constituency-form-heading">
        <h2 id="constituency-form-heading" className="text-lg font-bold text-slate-950">{editingId ? 'Edit constituency' : 'Add constituency'}</h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleSubmit(event)}>
          <label className="flex-1 text-sm font-semibold text-slate-700" htmlFor="constituency-name">
            Name
            <input
              id="constituency-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              className="form-input mt-2 h-11 w-full"
              placeholder="Enter constituency name"
            />
          </label>
          <div className="flex items-end gap-2">
            <button className="btn-primary h-11 min-w-32" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add constituency'}
            </button>
            {editingId && <button className="btn-secondary h-11" type="button" onClick={() => { setEditingId(null); setName(''); }}>Cancel</button>}
          </div>
        </form>
      </section>

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="card overflow-hidden" aria-labelledby="constituency-list-heading">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 id="constituency-list-heading" className="text-lg font-bold text-slate-950">All constituencies</h2>
            <p className="mt-1 text-sm text-slate-500">{result?.total ?? 0} total</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="constituency-search">
              Search
              <input id="constituency-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="form-input mt-1 h-10 w-full" placeholder="Search names" />
            </label>
            <label className="text-sm font-semibold text-slate-700" htmlFor="constituency-status">
              Status
              <select id="constituency-status" value={status} onChange={(event) => { setStatus(event.target.value as '' | 'active' | 'inactive'); setPage(1); }} className="form-input mt-1 h-10 w-full">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div role="status" className="p-8 text-center text-sm font-medium text-slate-500">Loading constituencies...</div>
        ) : result?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Assigned users</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-5 py-4 text-slate-600">{item.assignedUserCount}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secondary px-3 py-2" onClick={() => beginEdit(item)}>Edit</button>
                        <button type="button" className="btn-secondary px-3 py-2" disabled={busyId === item.id} onClick={() => void toggleStatus(item)}>
                          {busyId === item.id ? 'Saving...' : item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-slate-900">No constituencies found</h3>
            <p className="mt-1 text-sm text-slate-500">Try another search or add a constituency above.</p>
          </div>
        )}

        <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary px-3 py-2" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <button type="button" className="btn-secondary px-3 py-2" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
