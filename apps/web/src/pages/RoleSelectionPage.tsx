import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { activeRolesByActualRole, dashboardPathByRole, type UserRole } from '../auth/types';

const roleDetails: Record<UserRole, { title: string; description: string; icon: 'admin' | 'survey' | 'user' }> = {
  ADMIN: {
    title: 'Admin',
    description: 'Manage accounts and oversee the full survey workspace.',
    icon: 'admin',
  },
  SURVEYER: {
    title: 'Survey Head',
    description: 'Create and manage surveys, questions, and responses.',
    icon: 'survey',
  },
  USER: {
    title: 'User',
    description: 'Take part in surveys assigned to you.',
    icon: 'user',
  },
};

function RoleIcon({ icon }: { icon: (typeof roleDetails)[UserRole]['icon'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (icon === 'admin') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" {...common}><path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  }
  if (icon === 'survey') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" {...common}><path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z" /><path d="M9 4.5h6M8.5 10h7M8.5 14h7M8.5 18h4" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-1.5a7 7 0 0 1 14 0V20H5Z" /></svg>;
}

export function RoleSelectionPage() {
  const { user, isAuthenticated, isLoading, activateRole, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [error, setError] = useState('');
  const selecting = useRef(false);

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-white">Loading VASTHAV...</main>;
  }
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.activeRole) return <Navigate to={dashboardPathByRole[user.activeRole]} replace />;

  const roles = activeRolesByActualRole[user.actualRole];

  async function handleSelect(role: UserRole) {
    if (selecting.current) return;
    selecting.current = true;
    setPendingRole(role);
    setError('');
    try {
      const activated = await activateRole(role);
      if (!activated.activeRole) throw new Error('The server did not activate the selected role.');
      navigate(dashboardPathByRole[activated.activeRole], { replace: true });
    } catch (selectionError) {
      const message = selectionError instanceof Error ? selectionError.message : '';
      setError(message && message !== 'Request failed' ? message : 'We could not activate that workspace. Please try again.');
    } finally {
      selecting.current = false;
      setPendingRole(null);
    }
  }

  async function changeAccount() {
    try {
      await logout();
    } catch {
      // The local session is cleared by AuthContext even if revocation fails.
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-vasthav-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-vasthav-500/10 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/40">
        <header className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-6 py-7 text-center sm:px-10">
          <img src="/vasthav-logo.png" alt="VASTHAV" className="mx-auto h-20 w-auto object-contain" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-vasthav-700">Choose your workspace</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">How would you like to continue?</h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as <span className="font-semibold text-slate-700">{user.email}</span></p>
        </header>

        <div className="px-6 py-7 sm:px-10 sm:py-9">
          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className={`grid gap-4 ${roles.length === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {roles.map((role) => {
              const detail = roleDetails[role];
              const isPending = pendingRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  aria-label={`Continue as ${detail.title}`}
                  aria-pressed={isPending}
                  aria-busy={isPending}
                  disabled={pendingRole !== null}
                  onClick={() => void handleSelect(role)}
                  className={`group flex min-h-52 flex-col rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-vasthav-300 disabled:cursor-wait disabled:opacity-70 ${isPending ? 'border-vasthav-700 bg-vasthav-50 shadow-lg' : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-vasthav-400 hover:shadow-lg'}`}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-xl transition ${isPending ? 'bg-vasthav-700 text-white' : 'bg-vasthav-50 text-vasthav-700 group-hover:bg-vasthav-700 group-hover:text-white'}`}>
                    <RoleIcon icon={detail.icon} />
                  </span>
                  <span className="mt-5 text-lg font-bold text-slate-950">{detail.title}</span>
                  <span className="mt-2 flex-1 text-sm leading-6 text-slate-500">{detail.description}</span>
                  <span className="mt-4 flex items-center gap-2 text-sm font-bold text-vasthav-700">
                    {isPending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-vasthav-200 border-t-vasthav-700" /> Activating...</> : <>Continue <span aria-hidden="true">→</span></>}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => void changeAccount()} disabled={pendingRole !== null} className="mx-auto mt-7 block text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-vasthav-700 disabled:opacity-50">
            Back and change account
          </button>
        </div>
      </section>
    </main>
  );
}
