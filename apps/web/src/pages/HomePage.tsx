import { useTranslation } from 'react-i18next';
export function HomePage() { const { t } = useTranslation(); return <main><h1>{t('appName')}</h1><p>{t('welcome')}</p></main>; }
