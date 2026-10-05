import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { dashboardPathByRole, isUserRole } from '../auth/types';

export function RoleDashboardRedirect() {
  const { user } = useAuth();

  if (!user || !isUserRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={dashboardPathByRole[user.role]} replace />;
}
