import { Navigate } from 'react-router-dom';
import { isUserLoggedIn } from '../utils/session';
import type { RouteWrapperProps } from '../types';

const PublicRoute = ({ children }: RouteWrapperProps): React.JSX.Element => {
  const isAuthenticated = isUserLoggedIn();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default PublicRoute;
