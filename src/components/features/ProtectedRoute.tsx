import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { ROUTES } from '@/constants';
import { PageLoader } from '@/components/ui';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'agent' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, fetchCurrentUser, tokens } = useAuthStore();

  useEffect(() => {
    // If we have tokens but no user, fetch the user
    if (tokens && !user && !isLoading) {
      fetchCurrentUser();
    }
  }, [tokens, user, isLoading, fetchCurrentUser]);

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoader message="Checking authentication..." />;
  }

  // If we have tokens but still loading user, wait
  if (tokens && !user) {
    return <PageLoader message="Loading user..." />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}
