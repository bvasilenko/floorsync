import React from 'react';
import type { TaskCoordinates } from '../types';
import { useTaskCreationModalStore } from '../stores/ui/taskCreationModalStore';
import { CloseIcon, LocationIcon, PlusIcon } from './icons';

interface TaskCreationModalProps {
  isOpen: boolean;
  coordinates: TaskCoordinates | null;
  onClose: () => void;
  onSubmit: (title: string, coordinates: TaskCoordinates) => void;
}

const TaskCreationModal: React.FC<TaskCreationModalProps> = ({
  isOpen,
  coordinates,
  onClose,
  onSubmit,
}) => {
  const { title, setTitle, isSubmitting, setIsSubmitting } = useTaskCreationModalStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !coordinates) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(title.trim(), coordinates);
      setTitle('');
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-gray-200/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Create New Task
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 transition-all duration-200 disabled:opacity-50 p-2 rounded-lg"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          {coordinates && (
            <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/60">
              <div className="flex items-center text-sm text-gray-700">
                <LocationIcon className="w-5 h-5 mr-3 text-emerald-500" />
                <span className="font-medium">
                  Position: ({(coordinates.x * 100).toFixed(1)}%, {(coordinates.y * 100).toFixed(1)}
                  %)
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="task-title"
                className="block text-sm font-semibold text-gray-700 mb-3"
              >
                Task Title
              </label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 text-gray-900 placeholder-gray-500 transition-all duration-200"
                disabled={isSubmitting}
                maxLength={200}
                required
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-600 font-medium">
                {title.length}/200 characters
              </p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-5 mb-8 border border-gray-200/40">
              <h3 className="text-lg font-bold text-gray-800 mb-4 bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                Default Checklist
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mr-3"></div>
                  <span className="font-medium truncate" title="Review specifications">Review specifications</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mr-3"></div>
                  <span className="font-medium truncate" title="Prepare materials">Prepare materials</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mr-3"></div>
                  <span className="font-medium truncate" title="Set up work area">Set up work area</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mr-3"></div>
                  <span className="font-medium truncate" title="Execute task">Execute task</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mr-3"></div>
                  <span className="font-medium truncate" title="Quality check">Quality check</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mr-3"></div>
                  <span className="font-medium truncate" title="Clean up">Clean up</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-4 bg-white/60 backdrop-blur-sm rounded-lg p-3">
                A standard checklist will be added to this task. You can modify items after
                creation.
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-xl hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-300/50 disabled:opacity-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-50 disabled:from-gray-500 disabled:to-gray-500 transition-all duration-200 flex items-center shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-5 h-5 mr-3" />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskCreationModal;
