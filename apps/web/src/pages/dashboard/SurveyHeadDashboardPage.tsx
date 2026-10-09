import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DashboardHeader } from './DashboardHeader';

export function SurveyHeadDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page-container py-8 sm:py-10">
      <DashboardHeader
        title="Survey Head Dashboard"
        welcome={`Welcome back, ${user?.email ?? ''}. Continue to the survey workspace to review and manage surveys.`}
      />

      <section className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-950">Survey workspace</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Open the survey workspace to access the survey tools available to your role.
        </p>
        <Link to="/surveys" className="btn-primary mt-5 inline-flex">
          Open surveys
        </Link>
      </section>
    </div>
  );
}
