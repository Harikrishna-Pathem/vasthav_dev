import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import * as authService from '../auth/auth.service';

type ResetStep = 'email' | 'otp' | 'password' | 'success';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestInFlight = useRef(false);

  async function handleRequestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (requestInFlight.current) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('passwordReset.emailInvalid'));
      return;
    }

    requestInFlight.current = true;
    setIsSubmitting(true);
    setError('');
    setMessage('');
    setOtp('');
    setResetToken('');
    try {
      const result = await authService.requestPasswordReset(email.trim().toLowerCase());
      setMessage(result.message);
      setStep('otp');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '';
      setError(message && message !== 'Request failed' ? message : t('passwordReset.requestError'));
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    if (!/^\d{6}$/.test(otp)) {
      setError(t('passwordReset.otpInvalid'));
      return;
    }

    requestInFlight.current = true;
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.verifyPasswordResetOtp(email.trim().toLowerCase(), otp);
      setResetToken(result.resetToken);
      setStep('password');
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : '';
      setError(message && message !== 'Request failed' ? message : t('passwordReset.otpError'));
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError(t('passwordReset.passwordRequired'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t('passwordReset.passwordMismatch'));
      return;
    }

    requestInFlight.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const result = await authService.resetPassword(resetToken, newPassword, confirmNewPassword);
      setMessage(result.message);
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setStep('success');
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : '';
      setError(message && message !== 'Request failed' ? message : t('passwordReset.resetError'));
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function goBackToEmail() {
    setError('');
    setMessage('');
    setOtp('');
    setResetToken('');
    setStep('email');
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-vasthav-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-vasthav-500/10 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/40">
        <header className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-6 py-6 text-center sm:px-8">
          <img src="/vasthav-logo.png" alt="VASTHAV" className="mx-auto h-20 w-auto object-contain" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-vasthav-700">{t('passwordReset.title')}</p>
        </header>

        <div className="px-6 py-7 sm:px-8 sm:py-8">
          {step !== 'success' && <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{t(`passwordReset.${step}Heading`)}</h1>}
          {step !== 'success' && <p className="mt-1 text-sm leading-6 text-slate-500">{t(`passwordReset.${step}Description`)}</p>}

          {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && step !== 'success' && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          {step === 'email' && (
            <form onSubmit={(event) => void handleRequestCode(event)} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-slate-800">{t('auth.email')}</label>
                <input id="reset-email" className="form-input" type="email" autoComplete="email" maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? t('passwordReset.sending') : t('passwordReset.requestCode')}
              </button>
            </form>
          )}

          {step === 'otp' && (
            resetToken ? (
              <div className="mt-6 space-y-5">
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t('passwordReset.verified')}</p>
                <button type="button" onClick={() => setStep('password')} className="btn-primary h-12 w-full">{t('passwordReset.continue')}</button>
              </div>
            ) : (
              <>
                <form onSubmit={(event) => void handleVerifyOtp(event)} className="mt-6 space-y-5" noValidate>
                  <div>
                    <label htmlFor="reset-otp" className="mb-2 block text-sm font-semibold text-slate-800">{t('passwordReset.otpLabel')}</label>
                    <input id="reset-otp" className="form-input text-center font-mono text-xl tracking-[0.35em]" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={isSubmitting} />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:opacity-60">
                    {isSubmitting ? t('passwordReset.verifying') : t('passwordReset.verifyCode')}
                  </button>
                </form>
                <button type="button" onClick={() => void handleRequestCode()} disabled={isSubmitting} className="mt-5 block w-full text-center text-sm font-bold text-vasthav-700 hover:text-vasthav-800 disabled:opacity-50">
                  {isSubmitting ? t('passwordReset.sending') : t('passwordReset.resendCode')}
                </button>
              </>
            )
          )}

          {step === 'password' && (
            <form onSubmit={(event) => void handleResetPassword(event)} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-slate-800">{t('passwordReset.newPassword')}</label>
                <input id="new-password" className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="mb-2 block text-sm font-semibold text-slate-800">{t('passwordReset.confirmPassword')}</label>
                <input id="confirm-new-password" className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} disabled={isSubmitting} />
              </div>
              <button type="submit" disabled={isSubmitting || !resetToken} className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? t('passwordReset.resetting') : t('passwordReset.resetButton')}
              </button>
              <button type="button" onClick={() => setStep('otp')} disabled={isSubmitting} className="block w-full text-center text-sm font-semibold text-slate-500 hover:text-vasthav-700">{t('passwordReset.backToCode')}</button>
            </form>
          )}

          {step === 'success' && (
            <div className="py-3 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700" aria-hidden="true">✓</div>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">{t('passwordReset.successHeading')}</h1>
              <p role="status" className="mt-2 text-sm leading-6 text-slate-600">{message || t('passwordReset.successMessage')}</p>
              <Link to="/login" className="btn-primary mt-6 inline-flex h-11 items-center px-5">{t('passwordReset.backToLogin')}</Link>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 flex justify-center">
              {step === 'email'
                ? <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-vasthav-700">{t('passwordReset.backToLogin')}</Link>
                : <button type="button" onClick={goBackToEmail} disabled={isSubmitting} className="text-sm font-semibold text-slate-500 hover:text-vasthav-700">{t('passwordReset.changeEmail')}</button>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
