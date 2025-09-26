import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import FloorPlanView from './FloorPlanView';
import TaskCreationModal from './TaskCreationModal';
import ConfirmDialog from './ConfirmDialog';
import {
  CheckIcon,
  ClockIcon,
  XIcon,
  AlertIcon,
  EditIcon,
  TrashIcon,
  SquareIcon,
  InfoIcon,
  PlusIcon,
  ClipboardIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LogoutIcon,
} from './icons';
import { useAuthStore } from '../stores/authStore';
import {
  useDashboardStore,
  useTaskById,
  useIsTaskExpanded,
  useSetExpandedTaskId,
} from '../stores/ui/dashboardStore';
import { useChecklistStore } from '../stores/ui/checklistStore';
import type { TaskCoordinates, TaskDocument, ChecklistItem } from '../types';

const ChecklistStatusCheckbox: React.FC<{
  status: TaskDocument['checklist'][0]['status'];
  onClick: (e: React.MouseEvent) => void;
}> = ({ status, onClick }) => {
  const getCheckboxVariant = () => {
    switch (status) {
      case 'done':
        return (
          <CheckIcon className="w-6 h-6 text-emerald-400 transition-all duration-300 hover:scale-110" />
        );
      case 'in_progress':
        return (
          <ClockIcon className="w-6 h-6 text-yellow-400 transition-all duration-300 hover:scale-110" />
        );
      case 'blocked':
        return (
          <XIcon className="w-6 h-6 text-red-500 transition-all duration-300 hover:scale-110" />
        );
      case 'final_check_awaiting':
        return (
          <AlertIcon className="w-6 h-6 text-blue-400 transition-all duration-300 hover:scale-110" />
        );
      default:
        return (
          <SquareIcon className="w-6 h-6 text-gray-400 transition-all duration-300 hover:scale-110 hover:text-gray-600" />
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className="hover:scale-110 transition-all duration-200 p-1 rounded-lg hover:bg-white/10"
    >
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
        return 'bg-gray-300 border border-gray-400';
      case 'in_progress':
        return 'bg-yellow-400 shadow-lg shadow-yellow-400/30';
      case 'blocked':
        return 'bg-red-500 shadow-lg shadow-red-500/30';
      case 'final_check_awaiting':
        return 'bg-blue-400 shadow-lg shadow-blue-400/30';
      case 'done':
        return 'bg-emerald-400 shadow-lg shadow-emerald-400/30';
      default:
        return 'bg-gray-300 border border-gray-400';
    }
  };

  return (
    <div className={`w-3 h-3 rounded-full mr-2 transition-all duration-300 ${getStatusColor()}`} />
  );
};

const PencilIcon: React.FC = () => <EditIcon />;

const TaskCard: React.FC<{
  taskId: string;
  onChecklistStatusToggle: (
    taskId: string,
    itemId: string,
    status: TaskDocument['checklist'][0]['status']
  ) => void;
  onDeleteChecklistItem: (taskId: string, itemId: string, itemText: string) => void;
  onUpdateChecklistItemText: (taskId: string, itemId: string, currentText: string) => void;
  onAddChecklistItem: (taskId: string) => void;
}> = React.memo(
  ({
    taskId,
    onChecklistStatusToggle,
    onDeleteChecklistItem,
    onUpdateChecklistItemText,
    onAddChecklistItem,
  }) => {
    const task = useTaskById(taskId);
    const isExpanded = useIsTaskExpanded(taskId);
    const setExpandedTaskId = useSetExpandedTaskId();

    // All hooks must be called before any conditional returns
    const getCurrentExpandedTaskId = () => useDashboardStore.getState().expandedTaskId;

    const handleToggleExpand = useCallback(() => {
      const currentExpanded = getCurrentExpandedTaskId();
      setExpandedTaskId(currentExpanded === taskId ? null : taskId);
    }, [taskId, setExpandedTaskId]);

    if (!task) {
      return null;
    }

    const completedItems = task.checklist.filter(
      (item: ChecklistItem) => item.status === 'done'
    ).length;
    const totalItems = task.checklist.length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return (
      <div
        key={task.id}
        className="group bg-white/95 backdrop-blur-sm border border-gray-200/60 rounded-xl p-5 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 leading-tight line-clamp-2">{task.title}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <ClipboardIcon className="w-4 h-4 mr-2" />
              <span>
                {completedItems}/{totalItems} completed
              </span>
            </div>
          </div>
          <div className="ml-6">
            <div className="w-20 h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 font-semibold text-gray-900">
                  <ChevronRightIcon className="w-4 h-4 rotate-90" />
                  <span>Checklist</span>
                </div>
                <span className="text-sm text-gray-500">STEPS {task.checklist.length}</span>
              </div>

              <div>
                <h5 className="font-semibold text-gray-800 mb-3 truncate" title={task.checklistName}>{task.checklistName}</h5>

                <div className="space-y-2">
                  {task.checklist.map((item: ChecklistItem) => (
                    <div
                      key={item.id}
                      className="flex items-start space-x-3 bg-white/90 backdrop-blur-sm rounded-lg p-3 hover:bg-white hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <ChecklistStatusCheckbox
                          status={item.status}
                          onClick={e => {
                            e.stopPropagation();
                            onChecklistStatusToggle(task.id, item.id, item.status);
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" title={item.text}>{item.text}</div>
                        <div className="flex items-center mt-1">
                          <ChecklistStatusIndicator status={item.status} />
                          <span className="text-xs text-gray-600 capitalize font-medium">
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center space-x-1">
                        <button
                          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                          onClick={e => {
                            e.stopPropagation();
                            onUpdateChecklistItemText(task.id, item.id, item.text);
                          }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteChecklistItem(task.id, item.id, item.text);
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800"
                    onClick={e => {
                      e.stopPropagation();
                      onAddChecklistItem(task.id);
                    }}
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add new item</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const {
    userSession,
    setUserSession,
    tasks,
    userMenuOpen,
    setUserMenuOpen,
    taskModalOpen,
    setTaskModalOpen,
    pendingCoordinates,
    setPendingCoordinates,
    loadAllTasks,
    createTask,
    cleanup,
  } = useDashboardStore();

  const {
    updateChecklistItemStatus,
    deleteChecklistItem,
    addChecklistItem,
    updateChecklistItemText,
    deleteConfirm,
    setDeleteConfirm,
  } = useChecklistStore();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(state => {
      setUserSession(state.userSession);

      if (state.userSession) {
        loadAllTasks(state.userSession);
      }
    });

    const currentSession = useAuthStore.getState().userSession;
    if (currentSession) {
      setUserSession(currentSession);
      loadAllTasks(currentSession);
    }

    return unsubscribe;
  }, [setUserSession, loadAllTasks]);

  const handleFloorPlanClick = useCallback(
    (coordinates: TaskCoordinates) => {
      setPendingCoordinates(coordinates);
      setTaskModalOpen(true);
    },
    [setPendingCoordinates, setTaskModalOpen]
  );

  const handleTaskCreate = useCallback(
    async (title: string, coordinates: TaskCoordinates) => {
      if (!userSession) return;
      await createTask({ title, coordinates }, userSession);
    },
    [userSession, createTask]
  );

  const handleAddTaskClick = useCallback(() => {
    setPendingCoordinates({ x: 0.5, y: 0.5 });
    setTaskModalOpen(true);
  }, [setPendingCoordinates, setTaskModalOpen]);

  const handleChecklistStatusToggle = useCallback(
    async (
      taskId: string,
      itemId: string,
      currentStatus: TaskDocument['checklist'][0]['status']
    ) => {
      if (!userSession) {
        return;
      }

      const statusCycle: TaskDocument['checklist'][0]['status'][] = [
        'not_started',
        'in_progress', 
        'blocked',
        'final_check_awaiting',
        'done',
      ];
      const currentIndex = statusCycle.indexOf(currentStatus);
      const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

      await updateChecklistItemStatus(taskId, itemId, nextStatus, userSession);
    },
    [userSession, updateChecklistItemStatus]
  );

  const handleDeleteChecklistItem = useCallback(
    async (taskId: string, itemId: string, itemText: string) => {
      setDeleteConfirm({
        isOpen: true,
        taskId,
        itemId,
        itemText,
      });
    },
    [setDeleteConfirm]
  );

  const confirmDeleteChecklistItem = useCallback(async () => {
    if (!userSession || !deleteConfirm.taskId || !deleteConfirm.itemId) return;

    await deleteChecklistItem(deleteConfirm.taskId, deleteConfirm.itemId, userSession);

    setDeleteConfirm({
      isOpen: false,
      taskId: null,
      itemId: null,
      itemText: null,
    });
  }, [
    userSession,
    deleteConfirm.taskId,
    deleteConfirm.itemId,
    deleteChecklistItem,
    setDeleteConfirm,
  ]);

  const cancelDeleteChecklistItem = useCallback(() => {
    setDeleteConfirm({
      isOpen: false,
      taskId: null,
      itemId: null,
      itemText: null,
    });
  }, [setDeleteConfirm]);

  const handleAddChecklistItem = useCallback(
    async (taskId: string) => {
      if (!userSession) {
        return;
      }
      const newItemText = prompt('Enter new checklist item:');
      if (newItemText?.trim()) {
        await addChecklistItem(taskId, newItemText.trim(), userSession);
      }
    },
    [userSession, addChecklistItem]
  );

  const handleUpdateChecklistItemText = useCallback(
    async (taskId: string, itemId: string, currentText: string) => {
      if (!userSession) return;
      const newText = prompt('Edit item:', currentText);
      if (newText?.trim()) {
        await updateChecklistItemText(taskId, itemId, newText.trim(), userSession);
      }
    },
    [userSession, updateChecklistItemText]
  );

  const handleLogout = useCallback(async () => {
    // Close user menu before logout to prevent it staying open on next login
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  }, [logout, navigate, setUserMenuOpen]);

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
  }, [setUserMenuOpen]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div className="fixed inset-0 bg-gray-900">
      <FloorPlanView onTaskCreate={handleFloorPlanClick} />

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
                  <InfoIcon className="w-4 h-4" />
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
                      <ChevronDownIcon
                        className={`w-4 h-4 transition-transform text-gray-400 ${userMenuOpen ? 'rotate-180' : ''}`}
                      />
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
                          <LogoutIcon className="w-4 h-4 mr-3 text-gray-400" />
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

      <div className="absolute bottom-4 left-4 w-96 z-20">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Tasks
              </h2>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-white/80 backdrop-blur-sm border border-gray-200/60 text-gray-700">
                {tasks.length} tasks
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4 mb-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-700">No tasks yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Get started by creating your first task
                  </p>
                </div>
              ) : (
                tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    taskId={task.id}
                    onChecklistStatusToggle={handleChecklistStatusToggle}
                    onDeleteChecklistItem={handleDeleteChecklistItem}
                    onUpdateChecklistItemText={handleUpdateChecklistItemText}
                    onAddChecklistItem={handleAddChecklistItem}
                  />
                ))
              )}
            </div>

            <button
              onClick={handleAddTaskClick}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20"
            >
              <PlusIcon className="w-5 h-5 mr-3" />
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

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Checklist Item"
        message={`Are you sure you want to delete "${deleteConfirm.itemText}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteChecklistItem}
        onCancel={cancelDeleteChecklistItem}
      />
    </div>
  );
};

export default Dashboard;
