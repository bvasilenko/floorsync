import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import FloorPlanView from './FloorPlanView';
import TaskCreationModal from './TaskCreationModal';
import type { TaskCoordinates } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, userSession } = useAuthStore();
  const { tasks, loadAllTasks, createTask } = useTaskStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<TaskCoordinates | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleFloorPlanClick = (coordinates: TaskCoordinates) => {
    setPendingCoordinates(coordinates);
    setTaskModalOpen(true);
  };

  const handleTaskCreate = async (title: string, coordinates: TaskCoordinates) => {
    if (!userSession) return;
    await createTask({ title, coordinates }, userSession);
  };

  const handleAddTaskClick = () => {
    setPendingCoordinates({ x: 0.5, y: 0.5 });
    setTaskModalOpen(true);
  };

  useEffect(() => {
    if (userSession) {
      loadAllTasks(userSession);
    }
  }, [userSession, loadAllTasks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900">
      {/* Fullscreen Floor Plan */}
      <FloorPlanView onTaskCreate={handleFloorPlanClick} />
      
      {/* Floating Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-30">
        <div className="bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">FloorSync</h1>
                <span className="ml-4 text-sm text-gray-500">
                  Construction Task Management
                </span>
                {userSession && (
                  <span className="ml-4 text-sm text-indigo-600 font-medium">
                    Welcome, {userSession.userId}!
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Click on the plan to add tasks</span>
                </div>
                {userSession && (
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center text-sm rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium mr-3 text-indigo-600">
                        {userSession.userId.charAt(0).toUpperCase()}
                      </div>
                      <span className="mr-2 font-medium">{userSession.userId}</span>
                      <svg 
                        className={`w-4 h-4 transition-transform text-gray-400 ${userMenuOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium mr-3">
                              {userSession.userId.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{userSession.userId}</div>
                              <div className="text-xs text-gray-500">Signed in</div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="font-medium">Sign out</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Task List Panel */}
      <div className="absolute bottom-4 left-4 w-96 z-20">
        <div className="bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {tasks.length} tasks
              </span>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-3 mb-4">
              {tasks.length === 0 ? (
                /* Placeholder for when no tasks exist */
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first task</p>
                </div>
              ) : (
                /* Display actual tasks */
                tasks.map(task => {
                  const completedItems = task.checklist.filter(item => item.status === 'done').length;
                  const totalItems = task.checklist.length;
                  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                  
                  return (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 6h6m-6 4h6" />
                            </svg>
                            <span>{completedItems}/{totalItems} completed</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button 
              onClick={handleAddTaskClick}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Task
            </button>
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreationModal
        isOpen={taskModalOpen}
        coordinates={pendingCoordinates}
        onClose={() => {
          setTaskModalOpen(false);
          setPendingCoordinates(null);
        }}
        onSubmit={handleTaskCreate}
      />
    </div>
  );
};

export default Dashboard;
