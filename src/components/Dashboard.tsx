import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import FloorPlanView from './FloorPlanView';
import TaskCreationModal from './TaskCreationModal';
import { authStore } from '../stores/authStore';
import { taskStore } from '../stores/taskStore';
import { useReactiveComponent } from '../hooks/useReactiveComponent';
import type { TaskCoordinates, TaskDocument, UserSession } from '../types';

// SVG Icon Components
const ChecklistStatusCheckbox: React.FC<{
  status: TaskDocument['checklist'][0]['status'];
  onClick: () => void;
}> = ({ status, onClick }) => {
  const getCheckboxVariant = () => {
    switch (status) {
      case 'done':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              className="fill-current"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M9 12l2 2l4-4"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'blocked':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              className="fill-gray-300"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 8l8 8M8 16l8-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
    }
  };

  return (
    <button onClick={onClick} className="hover:scale-110 transition-transform">
      {getCheckboxVariant()}
    </button>
  );
};

const ChecklistStatusIndicator: React.FC<{ status: TaskDocument['checklist'][0]['status'] }> = ({
  status,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-400';
      case 'in_progress':
        return 'bg-yellow-400';
      case 'blocked':
        return 'bg-red-500';
      case 'final_check_awaiting':
        return 'bg-blue-500';
      case 'done':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  return <div className={`w-2 h-2 rounded-full mr-1 ${getStatusColor()}`} />;
};

const PencilIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { when } = useReactiveComponent();

  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<TaskCoordinates | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [collapsedChecklists, setCollapsedChecklists] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    when(authStore.userSession$, session => {
      setUserSession(session);
    });

    when(taskStore.tasks$, taskList => {
      setTasks(taskList as TaskDocument[]);
    });
  });

  const handleLogout = async () => {
    await authStore.logout();
    navigate('/login');
  };

  const handleFloorPlanClick = useCallback((coordinates: TaskCoordinates) => {
    setPendingCoordinates(coordinates);
    setTaskModalOpen(true);
  }, []);

  const handleTaskCreate = async (title: string, coordinates: TaskCoordinates) => {
    if (!userSession) return;
    await taskStore.createTask({ title, coordinates }, userSession);
  };

  const handleAddTaskClick = () => {
    setPendingCoordinates({ x: 0.5, y: 0.5 });
    setTaskModalOpen(true);
  };

  // Checklist operation handlers
  const handleChecklistStatusToggle = useCallback(
    async (
      taskId: string,
      itemId: string,
      currentStatus: TaskDocument['checklist'][0]['status']
    ) => {
      if (!userSession) return;

      // Cycle through statuses: not_started -> in_progress -> done -> not_started
      const statusCycle: TaskDocument['checklist'][0]['status'][] = [
        'not_started',
        'in_progress',
        'done',
      ];
      const currentIndex = statusCycle.indexOf(currentStatus);
      const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

      await taskStore.updateChecklistItemStatus(taskId, itemId, nextStatus, userSession);
    },
    [userSession]
  );

  const handleDeleteChecklistItem = useCallback(
    async (taskId: string, itemId: string) => {
      if (!userSession) return;
      await taskStore.deleteChecklistItem(taskId, itemId, userSession);
    },
    [userSession]
  );

  const handleAddChecklistItem = useCallback(
    async (taskId: string) => {
      if (!userSession) return;
      const newItemText = prompt('Enter new checklist item:');
      if (newItemText?.trim()) {
        await taskStore.addChecklistItem(taskId, newItemText.trim(), userSession);
      }
    },
    [userSession]
  );

  const handleUpdateChecklistItemText = useCallback(
    async (taskId: string, itemId: string, currentText: string) => {
      if (!userSession) return;
      const newText = prompt('Edit item:', currentText);
      if (newText?.trim()) {
        await taskStore.updateChecklistItemText(taskId, itemId, newText.trim(), userSession);
      }
    },
    [userSession]
  );

  const toggleChecklistCollapse = useCallback((taskId: string) => {
    setCollapsedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  /* Initialize tasks when user session is available */
  useEffect(() => {
    if (userSession) {
      taskStore.loadAllTasks(userSession);
    }
  }, [userSession]);

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
      <FloorPlanView onTaskCreate={handleFloorPlanClick} />

      {/* Floating Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-30">
        <div className="bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">FloorSync</h1>
                <span className="ml-4 text-sm text-gray-500">Construction Task Management</span>
                {userSession && (
                  <span className="ml-4 text-sm text-indigo-600 font-medium">
                    Welcome, {userSession.userId}!
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
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
                              <div className="text-sm font-medium text-gray-900">
                                {userSession.userId}
                              </div>
                              <div className="text-xs text-gray-500">Signed in</div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
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
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first task
                  </p>
                </div>
              ) : (
                /* Display actual tasks */
                tasks.map(task => {
                  const completedItems = task.checklist.filter(
                    item => item.status === 'done'
                  ).length;
                  const totalItems = task.checklist.length;
                  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                  return (
                    <div
                      key={task.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                          <div className="flex items-center text-sm text-gray-500">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 6h6m-6 4h6"
                              />
                            </svg>
                            <span>
                              {completedItems}/{totalItems} completed
                            </span>
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

                      {/* Inline Task Editor - Expanded State */}
                      {expandedTaskId === task.id && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          {/* Collapsible Checklist Section */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                onClick={() => toggleChecklistCollapse(task.id)}
                                className="flex items-center space-x-2 font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${collapsedChecklists.has(task.id) ? 'rotate-0' : 'rotate-90'}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                                <span>Checklist</span>
                              </button>
                              <span className="text-sm text-gray-500">
                                STEPS {task.checklist.length}
                              </span>
                            </div>

                            {/* Collapsible Content */}
                            {!collapsedChecklists.has(task.id) && (
                              <div className="animate-in slide-in-from-top-2 duration-200">
                                <h5 className="font-semibold text-gray-800 mb-3">
                                  {task.checklistName}
                                </h5>

                                {/* Checklist Items */}
                                <div className="space-y-2">
                                  {task.checklist.map(item => (
                                    <div key={item.id} className="flex items-start space-x-3">
                                      {/* SVG Checkbox */}
                                      <div className="flex-shrink-0 mt-0.5">
                                        <ChecklistStatusCheckbox
                                          status={item.status}
                                          onClick={() =>
                                            handleChecklistStatusToggle(
                                              task.id,
                                              item.id,
                                              item.status
                                            )
                                          }
                                        />
                                      </div>

                                      {/* Item Content */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-900">{item.text}</div>
                                        <div className="flex items-center mt-1">
                                          <ChecklistStatusIndicator status={item.status} />
                                          <span className="text-xs text-gray-500 capitalize">
                                            {item.status.replace('_', ' ')}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Edit/Delete Icons */}
                                      <div className="flex-shrink-0 flex items-center space-x-1">
                                        <button
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleUpdateChecklistItemText(
                                              task.id,
                                              item.id,
                                              item.text
                                            );
                                          }}
                                        >
                                          <PencilIcon />
                                        </button>
                                        <button
                                          className="p-1 text-gray-400 hover:text-red-600"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleDeleteChecklistItem(task.id, item.id);
                                          }}
                                        >
                                          <TrashIcon />
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Add New Item Button */}
                                  <button
                                    className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800"
                                    onClick={() => handleAddChecklistItem(task.id)}
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                    <span>Add new item</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add New Task
            </button>
          </div>
        </div>
      </div>

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
