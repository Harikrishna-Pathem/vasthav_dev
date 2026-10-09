import { useAuth } from '../../auth/AuthContext';
import { DashboardHeader } from './DashboardHeader';

export function UserDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page-container py-8 sm:py-10">
      <DashboardHeader
        title="User Dashboard"
        welcome={`Welcome back, ${user?.email ?? ''}. Your account information is available below.`}
      />

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">Account</h2>
          <p className="mt-1 text-sm text-slate-500">Your current VASTHAV account information.</p>
        </div>
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active role</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">User</dd>
          </div>
        </dl>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-semibold text-slate-950">Survey participation</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Survey participation options will appear here when available.
        </p>
      </section>
    </div>
  );
}
