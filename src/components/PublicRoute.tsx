import { Navigate } from 'react-router-dom';
import { isUserLoggedIn } from '../utils/session';

interface PublicRouteProps {
  children: React.ReactNode;
}

/* Login route protection - redirect to dashboard if already authenticated */
const PublicRoute = ({ children }: PublicRouteProps) => {
  const isAuthenticated = isUserLoggedIn();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default PublicRoute;
