import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { dashboardPathByRole, isAuthUser } from '../auth/types';

export function RoleDashboardRedirect() {
  const { user } = useAuth();

  if (!user || !isAuthUser(user)) {
    return <Navigate to="/login" replace />;
  }

  if (!user.activeRole) return <Navigate to="/select-role" replace />;
  return <Navigate to={dashboardPathByRole[user.activeRole]} replace />;
}
