import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listConstituencies } from '../../services/constituency.service';
import { registerUser } from '../../services/registration.service';
import type { ConstituencyOption } from '../../types/registration';

const mobilePattern = /^[6-9]\d{9}$/;

export function RegistrationPage() {
  const navigate = useNavigate();
  const [constituencies, setConstituencies] = useState<ConstituencyOption[]>([]);
  const [isLoadingConstituencies, setIsLoadingConstituencies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadConstituencies = useCallback(async () => {
    setError('');
    setIsLoadingConstituencies(true);
    try {
      const items = await listConstituencies();
      setConstituencies(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load constituencies.');
    } finally {
      setIsLoadingConstituencies(false);
    }
  }, []);

  useEffect(() => {
    void loadConstituencies();
  }, [loadConstituencies]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!mobilePattern.test(mobileNumber.trim())) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        password,
        confirmPassword,
        constituencyId,
      });
      navigate('/register/verify-otp', {
        state: { email: email.trim().toLowerCase() },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-vasthav-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-vasthav-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/40">
          <header className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-6 py-6 text-center sm:px-8">
            <img src="/vasthav-logo.png" alt="VASTHAV" className="mx-auto h-20 w-auto object-contain" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-vasthav-700">
              Create your VASTHAV account
            </p>
          </header>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Create New User</h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Enter your details. We will email a code to verify your account.
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
                {(error.toLowerCase().includes('send the verification email')
                  || error.toLowerCase().includes('already registered')) && email.trim() && (
                  <button
                    type="button"
                    onClick={() => navigate('/register/verify-otp', { state: { email: email.trim().toLowerCase() } })}
                    className="ml-1 font-bold underline underline-offset-2"
                  >
                    Continue to verification or resend the code.
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="registration-name" className="mb-2 block text-sm font-semibold text-slate-800">Full name</label>
                <input id="registration-name" className="form-input" autoComplete="name" maxLength={150} required value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
              </div>

              <div>
                <label htmlFor="registration-email" className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
                <input id="registration-email" className="form-input" type="email" autoComplete="email" maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
              </div>

              <div>
                <label htmlFor="registration-mobile" className="mb-2 block text-sm font-semibold text-slate-800">Mobile number</label>
                <input id="registration-mobile" className="form-input" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" maxLength={10} required value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} disabled={isSubmitting} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="registration-constituency" className="mb-2 block text-sm font-semibold text-slate-800">Constituency</label>
                <select id="registration-constituency" className="form-input" required value={constituencyId} onChange={(event) => setConstituencyId(event.target.value)} disabled={isSubmitting || isLoadingConstituencies || !constituencies.length}>
                  <option value="">{isLoadingConstituencies ? 'Loading constituencies...' : 'Select your constituency'}</option>
                  {constituencies.map((constituency) => (
                    <option key={constituency.id} value={constituency.id}>{constituency.name}</option>
                  ))}
                </select>
                {!isLoadingConstituencies && !constituencies.length && (
                  <button type="button" onClick={() => void loadConstituencies()} className="mt-2 text-sm font-semibold text-vasthav-700 hover:text-vasthav-800">
                    Try loading constituencies again
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="registration-password" className="mb-2 block text-sm font-semibold text-slate-800">Password</label>
                <input id="registration-password" className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} />
                <p className="mt-1 text-xs text-slate-500">Use at least 12 characters.</p>
              </div>

              <div>
                <label htmlFor="registration-confirm-password" className="mb-2 block text-sm font-semibold text-slate-800">Confirm password</label>
                <input id="registration-confirm-password" className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isSubmitting} />
              </div>

              <div className="sm:col-span-2">
                <button type="submit" disabled={isSubmitting || isLoadingConstituencies || !constituencies.length} className="btn-primary h-12 w-full">
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account? <Link to="/login" className="font-bold text-vasthav-700 hover:text-vasthav-800">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
