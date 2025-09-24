import { Navigate } from 'react-router-dom';
import { isUserLoggedIn } from '../utils/session';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/* Dashboard route protection - redirect to login if not authenticated */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = isUserLoggedIn();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
