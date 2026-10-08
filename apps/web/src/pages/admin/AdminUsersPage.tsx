import { useCallback, useEffect, useState } from 'react';

import { listConstituencies } from '../../services/constituency.service';
import { assignUserConstituency, listAdminUsers } from '../../services/admin-user.service';
import type { ConstituencyOption } from '../../types/registration';
import type { AdminUser, AdminUserList } from '../../types/admin-user';

const PAGE_SIZE = 10;

export function AdminUsersPage() {
  const [result, setResult] = useState<AdminUserList | null>(null);
  const [constituencies, setConstituencies] = useState<ConstituencyOption[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConstituencies, setIsLoadingConstituencies] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setResult(await listAdminUsers({ page, limit: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}) }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => {
    let isCurrent = true;
    void listConstituencies().then((items) => {
      if (isCurrent) setConstituencies(items);
    }).catch((loadError: unknown) => {
      if (isCurrent) setError(loadError instanceof Error ? loadError.message : 'Unable to load active constituencies.');
    }).finally(() => {
      if (isCurrent) setIsLoadingConstituencies(false);
    });
    return () => { isCurrent = false; };
  }, []);

  async function changeConstituency(user: AdminUser, constituencyId: string | null) {
    if (constituencyId === null && !window.confirm(`Remove the constituency assignment for ${user.displayName}?`)) return;
    setPendingUserId(user.id);
    setError('');
    setNotice('');
    try {
      await assignUserConstituency(user.id, constituencyId);
      setNotice(`Constituency updated for ${user.displayName}.`);
      await loadUsers();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Unable to update the user constituency.');
    } finally {
      setPendingUserId(null);
    }
  }

  const totalPages = Math.max(Math.ceil((result?.total ?? 0) / PAGE_SIZE), 1);

  return (
    <div className="page-container py-8 sm:py-10">
      <header className="mb-7">
        <p className="text-sm font-semibold text-vasthav-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Users</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review user accounts and assign an active constituency.</p>
      </header>

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="card overflow-hidden" aria-labelledby="users-list-heading">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 id="users-list-heading" className="text-lg font-bold text-slate-950">User accounts</h2>
            <p className="mt-1 text-sm text-slate-500">{result?.total ?? 0} total</p>
          </div>
          <label className="text-sm font-semibold text-slate-700 sm:w-80" htmlFor="user-search">
            Search users
            <input id="user-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="form-input mt-1 h-10 w-full" placeholder="Name or email" />
          </label>
        </div>

        {isLoading ? (
          <div role="status" className="p-8 text-center text-sm font-medium text-slate-500">Loading users...</div>
        ) : result?.data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Constituency</th><th className="px-5 py-3">Assignment</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{user.displayName}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.role}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4 text-slate-700">
                      {user.constituency ? <>{user.constituency.name}{!user.constituency.isActive && <span className="ml-2 text-xs font-semibold text-amber-700">Inactive</span>}</> : <span className="text-slate-400">Not assigned</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`assign-${user.id}`}>Assign active constituency to {user.displayName}</label>
                        <select
                          id={`assign-${user.id}`}
                          value=""
                          disabled={pendingUserId === user.id || isLoadingConstituencies || constituencies.length === 0}
                          onChange={(event) => { if (event.target.value) void changeConstituency(user, event.target.value); }}
                          className="form-input min-w-52"
                        >
                          <option value="">{isLoadingConstituencies ? 'Loading...' : 'Assign or change'}</option>
                          {constituencies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        {user.constituency && <button type="button" className="btn-secondary px-3 py-2" disabled={pendingUserId === user.id} onClick={() => void changeConstituency(user, null)}>
                          {pendingUserId === user.id ? 'Saving...' : 'Remove'}
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-slate-900">No users found</h3>
            <p className="mt-1 text-sm text-slate-500">Try another search.</p>
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
