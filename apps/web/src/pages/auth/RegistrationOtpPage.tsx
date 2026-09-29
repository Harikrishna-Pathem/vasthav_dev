import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { resendRegistrationOtp, verifyRegistrationOtp } from '../../services/registration.service';

export function RegistrationOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsVerifying(true);
    try {
      const result = await verifyRegistrationOtp(email.trim().toLowerCase(), otp.trim());
      navigate('/login', { replace: true, state: { registrationVerified: result.message } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify the code.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError('');
    setSuccess('');
    setIsResending(true);
    try {
      const result = await resendRegistrationOtp(email.trim().toLowerCase());
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend the code.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-vasthav-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-vasthav-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/40">
          <header className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-6 py-6 text-center sm:px-8">
            <img src="/vasthav-logo.png" alt="VASTHAV" className="mx-auto h-20 w-auto object-contain" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-vasthav-700">Email verification</p>
          </header>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Verify your email</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">Enter the six-digit code we sent to your email address.</p>

            {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            <form onSubmit={handleVerify} className="mt-6 space-y-5">
              <div>
                <label htmlFor="verification-email" className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
                <input id="verification-email" className="form-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={isVerifying || isResending} />
              </div>
              <div>
                <label htmlFor="verification-code" className="mb-2 block text-sm font-semibold text-slate-800">Verification code</label>
                <input id="verification-code" className="form-input text-center font-mono text-xl tracking-[0.35em]" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} minLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={isVerifying || isResending} />
              </div>
              <button type="submit" disabled={isVerifying || isResending} className="btn-primary h-12 w-full">
                {isVerifying ? 'Verifying...' : 'Verify email'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button type="button" onClick={() => void handleResend()} disabled={!email.trim() || isVerifying || isResending} className="text-sm font-bold text-vasthav-700 hover:text-vasthav-800 disabled:cursor-not-allowed disabled:opacity-50">
                {isResending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/register" className="font-semibold text-slate-600 hover:text-vasthav-700">Back to registration</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
