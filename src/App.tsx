import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { authStore } from './stores/authStore';
import { useAppStore } from './stores/ui/appStore';
import { useReactiveComponent } from './hooks/useReactiveComponent';

function App() {
  const { when } = useReactiveComponent();
  const { userSession, setUserSession, isLoading, setIsLoading } = useAppStore();

  useEffect(() => {
    when(authStore.userSession$, session => {
      setUserSession(session);
    });

    when(authStore.isLoading$, loading => {
      setIsLoading(loading);
    });

    authStore.restoreSession();
  }, [when, setUserSession, setIsLoading]);

  const shouldShowLoading = () => {
    return authStore.isLoading || isLoading;
  };

  if (shouldShowLoading()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<Navigate to={userSession ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
