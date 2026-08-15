import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';

export const AdminRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p role="status">Loading authentication...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.role !== 'ADMIN') {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
};
