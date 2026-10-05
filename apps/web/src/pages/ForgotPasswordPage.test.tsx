import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authService from '../auth/auth.service';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import '../i18n/i18n';

vi.mock('../auth/auth.service', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPasswordResetOtp: vi.fn(),
  resetPassword: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('requests a code, verifies it, resets the password, and returns to login', async () => {
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({
      message: 'If an account exists for this email, a password reset code has been sent.',
    });
    vi.mocked(authService.verifyPasswordResetOtp).mockResolvedValue({
      message: 'Verification successful. Set your new password.',
      resetToken: 'a'.repeat(64),
    });
    vi.mocked(authService.resetPassword).mockResolvedValue({
      message: 'Password updated successfully. Please log in with your new password.',
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));
    expect(await screen.findByLabelText('Email verification code')).toBeInTheDocument();
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('person@example.com');

    fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new secure password value' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new secure password value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(authService.resetPassword).toHaveBeenCalledWith('a'.repeat(64), 'new secure password value', 'new secure password value');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    fireEvent.click(screen.getByRole('link', { name: 'Back to login' }));
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('validates confirmation and does not submit mismatched passwords', async () => {
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({ message: 'If an account exists, a code was sent.' });
    vi.mocked(authService.verifyPasswordResetOtp).mockResolvedValue({ message: 'Verified', resetToken: 'b'.repeat(64) });
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByLabelText('Email verification code');
    fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
    await screen.findByLabelText('New password');
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new secure password value' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different secure password value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The passwords do not match.');
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('shows a loading state and prevents duplicate requests while pending', async () => {
    let resolveRequest!: (value: { message: string }) => void;
    vi.mocked(authService.requestPasswordReset).mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Sending...' }).closest('form')!);
    expect(authService.requestPasswordReset).toHaveBeenCalledTimes(1);

    resolveRequest({ message: 'If an account exists for this email, a password reset code has been sent.' });
    await waitFor(() => expect(screen.getByLabelText('Email verification code')).toBeInTheDocument());
  });

  it('shows a safe generic error when the reset request cannot reach the API', async () => {
    vi.mocked(authService.requestPasswordReset).mockRejectedValue(new Error('Request failed'));
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not request a reset code. Please try again.');
    expect(screen.queryByLabelText('Email verification code')).not.toBeInTheDocument();
  });

  it('shows a safe error when code verification fails', async () => {
    vi.mocked(authService.requestPasswordReset).mockResolvedValue({ message: 'If an account exists, a code was sent.' });
    vi.mocked(authService.verifyPasswordResetOtp).mockRejectedValue(new Error('Invalid or expired OTP'));
    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));
    await screen.findByLabelText('Email verification code');
    fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired OTP');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });
});
