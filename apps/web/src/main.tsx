import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n/i18n';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><QueryClientProvider client={client}><App /></QueryClientProvider></ErrorBoundary></StrictMode>);
