import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { listAdminUsers } from '../../services/admin-user.service';
import { listManagedConstituencies } from '../../services/constituency.service';
import { DashboardHeader } from './DashboardHeader';

interface DashboardCounts {
  users: number;
  constituencies: number;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retry, setRetry] = useState(0);

  const loadCounts = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [users, constituencies] = await Promise.all([
        listAdminUsers({ page: 1, limit: 1 }),
        listManagedConstituencies({ page: 1, limit: 1 }),
      ]);
      setCounts({ users: users.total, constituencies: constituencies.total });
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts, retry]);

  return (
    <div className="page-container py-8 sm:py-10">
      <DashboardHeader
        title="Admin Dashboard"
        welcome={`Welcome back, ${user?.email ?? ''}. Review platform accounts and manage constituencies.`}
      />

      {isLoading ? (
        <div role="status" className="card p-6 text-sm font-medium text-slate-500">
          Loading dashboard summaries...
        </div>
      ) : hasError ? (
        <div className="card p-6" role="alert">
          <p className="text-sm text-red-700">Unable to load dashboard summaries. Please try again.</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : counts ? (
        <section className="grid gap-5 md:grid-cols-2" aria-label="Administration summaries">
          <Link to="/admin/users" className="card block p-6 transition hover:-translate-y-0.5 hover:shadow-soft">
            <p className="text-sm font-medium text-slate-500">Total users</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{counts.users}</p>
            <p className="mt-2 text-sm text-slate-500">
              {counts.users === 0 ? 'No user accounts yet.' : 'View and manage user accounts.'}
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-vasthav-700">Manage users</span>
          </Link>

          <Link to="/admin/constituencies" className="card block p-6 transition hover:-translate-y-0.5 hover:shadow-soft">
            <p className="text-sm font-medium text-slate-500">Total constituencies</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{counts.constituencies}</p>
            <p className="mt-2 text-sm text-slate-500">
              {counts.constituencies === 0 ? 'No constituencies yet.' : 'View and manage constituencies.'}
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-vasthav-700">Manage constituencies</span>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
