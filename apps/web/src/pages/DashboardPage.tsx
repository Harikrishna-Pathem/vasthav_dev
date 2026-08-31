import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <main>
      <header>
        <h1>{t('appName')}</h1>

        <button type="button" onClick={() => void logout()}>
          {t('auth.logout')}
        </button>
      </header>

      <section>
        <h2>{t('dashboard.title')}</h2>

        <p>{t('dashboard.welcome', { email: user?.email })}</p>

        <p>
          {t('dashboard.role')}: <strong>{user?.role}</strong>
        </p>
      </section>
    </main>
  );
}