import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

const cards = [
  {
    title: 'Surveys',
    value: '0',
    description: 'Manage your survey collection',
  },
  {
    title: 'Questions',
    value: '0',
    description: 'Create and manage questions',
  },
  {
    title: 'Translations',
    value: 'EN / TE / HI',
    description: 'Multilingual content support',
  },
];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="page-container py-8 sm:py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold text-vasthav-700">
          Overview
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t('dashboard.title')}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Welcome back, {user?.email}. Manage surveys, questions and
          multilingual content from one place.
        </p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="card p-6 transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-vasthav-50 text-lg font-bold text-vasthav-700">
                {card.title.charAt(0)}
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Manage
              </span>
            </div>

            <p className="text-sm font-medium text-slate-500">
              {card.title}
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {card.value}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {card.description}
            </p>
          </div>
        ))}
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">Account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your current VASTHAV access information.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {user?.email}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Role
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {user?.role}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}