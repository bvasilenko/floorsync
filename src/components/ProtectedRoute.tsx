import { Navigate } from 'react-router-dom';
import { isUserLoggedIn } from '../utils/session';
import type { RouteWrapperProps } from '../types';

const ProtectedRoute = ({ children }: RouteWrapperProps): React.JSX.Element => {
  const isAuthenticated = isUserLoggedIn();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
