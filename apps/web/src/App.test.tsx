import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';
import './i18n/i18n';
it('renders the application foundation', () => { render(<App />); expect(screen.getByText('Welcome to VASTHAV')).toBeInTheDocument(); });
