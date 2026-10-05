import { Link } from 'react-router-dom';

export function ForgotPasswordPlaceholderPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <img src="/vasthav-logo.png" alt="VASTHAV" className="mx-auto h-20 w-auto object-contain" />
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Password recovery</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Password recovery is not available yet. Please contact your administrator for help.
        </p>
        <Link to="/login" className="btn-primary mt-6 inline-flex h-11 items-center px-5">
          Back to login
        </Link>
      </section>
    </main>
  );
}
