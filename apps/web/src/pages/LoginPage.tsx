import {
  FormEvent,
  useState,
} from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password, rememberMe);

      const from =
        (location.state as { from?: string } | null)?.from ??
        '/dashboard';

      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.loginFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-vasthav-600/20 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] animate-pulse rounded-full bg-vasthav-500/10 blur-3xl [animation-delay:1.5s]" />

        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%)]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      {/* Login area */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-md motion-safe:animate-[loginCardIn_.65s_cubic-bezier(.22,1,.36,1)]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/40">
            {/* Logo header */}
            <div className="relative border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
              <div className="flex justify-center">
                <div className="relative flex h-28 w-full max-w-[245px] items-center justify-center">
                  <div className="absolute inset-5 rounded-full bg-vasthav-100/60 blur-2xl" />

                  <img
                    src="/vasthav-logo.png"
                    alt="VASTHAV"
                    className="relative z-10 max-h-28 w-auto max-w-full object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.14)] motion-safe:animate-[logoIn_.8s_ease-out]"
                  />
                </div>
              </div>

              <div className="mt-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vasthav-700">
                  Survey management platform
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div>
                <h1 className="text-xl mb-0 font-extrabold tracking-tight text-slate-950">
                  {t('auth.login')}
                </h1>

                <p className=" text-sm leading-6 text-slate-500">
                  Sign in to manage your surveys and questions.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-black text-red-600">
                      !
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold">
                        {t('auth.loginFailed')}
                      </p>

                      <p className="mt-1 break-words leading-5">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-7 space-y-5"
                noValidate
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    {t('auth.email')}
                  </label>

                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4 7 7.1 5.2a1.5 1.5 0 0 0 1.8 0L20 7"
                        />
                      </svg>
                    </div>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);

                        if (error) {
                          setError('');
                        }
                      }}
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting}
                      className="form-input h-12 w-full pl-11 transition duration-200 focus:ring-4 focus:ring-vasthav-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    {t('auth.password')}
                  </label>

                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <rect
                          width="14"
                          height="11"
                          x="5"
                          y="10"
                          rx="2"
                        />
                        <path
                          strokeLinecap="round"
                          d="M8 10V7a4 4 0 0 1 8 0v3"
                        />
                      </svg>
                    </div>

                    <input
                      id="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);

                        if (error) {
                          setError('');
                        }
                      }}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      disabled={isSubmitting}
                      className="form-input h-12 w-full pl-11 pr-20 transition duration-200 focus:ring-4 focus:ring-vasthav-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current,
                        )
                      }
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-slate-400 transition hover:text-vasthav-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {showPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="flex cursor-pointer items-center gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked,
                      )
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-slate-300 text-vasthav-700 focus:ring-vasthav-500"
                  />

                  <span className="text-sm font-medium text-slate-600">
                    Remember me
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-vasthav-700 px-5 text-sm font-bold text-white shadow-lg shadow-vasthav-700/20 transition duration-200 hover:-translate-y-0.5 hover:bg-vasthav-800 hover:shadow-xl hover:shadow-vasthav-700/25 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                  {isSubmitting ? (
                    <span className="relative flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      {t('auth.loggingIn')}
                    </span>
                  ) : (
                    <span className="relative">
                      {t('auth.login')}
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 text-center sm:px-8">
              <p className="text-xs font-medium text-slate-400">
                Secure access to your VASTHAV workspace
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-slate-500">
            � {new Date().getFullYear()} VASTHAV
          </p>
        </section>
      </div>

      <style>{`
        @keyframes loginCardIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes logoIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
