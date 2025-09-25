import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { useAuthStore, authStoreRx } from './stores/authStore';
import { useReactiveComponent } from './hooks/useReactiveComponent';
import type { UserSession } from './types';

function App() {
  const { when } = useReactiveComponent();

  /* Component state - ONLY updates when observables emit */
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* CONTROLLED reactivity - subscribe only to what you need */
  useEffect(() => {
    console.log('🎯 App: Setting up subscriptions');

    /* Only react to user session changes - SOLID DRY KISS decoupling */
    when(authStoreRx.userSession$, session => {
      console.log('📡 App: userSession changed', session?.userId || 'null');
      setUserSession(session);
    });

    /* Only react to loading state changes */
    when(authStoreRx.isLoading$, loading => {
      console.log('📡 App: isLoading changed', loading);
      setIsLoading(loading);
    });

    /* Initialize app - direct action call, no subscription needed */
    console.log('🚀 App: Calling restoreSession');
    useAuthStore.getState().restoreSession();
  }, []); // Remove 'when' from dependencies to prevent re-subscription

  /* Static access when needed - no reactive subscription, following Angular pattern */
  const shouldShowLoading = () => {
    return authStoreRx.snapshot.isLoading || isLoading;
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
