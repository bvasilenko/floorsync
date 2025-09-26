import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';
import { BuildingIcon, InfoIcon, SpinnerIcon } from './icons';

const Login: React.FC = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const { login, clearError, isLoading, error, userSession } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    clearError();
    await login(name.trim());

    if (userSession) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl backdrop-blur-sm">
            <BuildingIcon className="text-white" />
          </div>
          <h2 className="mt-8 text-center text-4xl font-bold text-gray-800 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Welcome to FloorSync
          </h2>
          <p className="mt-3 text-center text-lg text-gray-600 font-medium">
            Construction Task Management Platform
          </p>
          <p className="mt-2 text-center text-sm text-gray-500">
            Enter your name to access your workspace
          </p>
        </div>
        <div className="bg-white/30 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl py-10 px-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50/80 backdrop-blur-sm p-5 border border-red-200/60">
                <div className="flex">
                  <InfoIcon className="h-6 w-6 text-red-500" />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-red-800">{error}</div>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-3">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isLoading}
                className="appearance-none rounded-xl relative block w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 sm:text-sm disabled:opacity-50 disabled:bg-gray-100/50 transition-all duration-200"
                placeholder="e.g. John Smith, user1, manager..."
              />
              <p className="mt-2 text-xs text-gray-600 bg-white/50 backdrop-blur-sm rounded-lg p-2">
                No password required. If this is your first time, a new workspace will be created.
              </p>
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading && <SpinnerIcon className="animate-spin -ml-1 mr-3 text-white" />}
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 bg-white/40 backdrop-blur-sm rounded-lg p-3">
              Each user gets their own secure workspace with complete data isolation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
