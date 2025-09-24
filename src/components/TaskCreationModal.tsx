import React, { useState } from 'react';
import type { TaskCoordinates } from '../types';

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
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {coordinates && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Position: ({(coordinates.x * 100).toFixed(1)}%, {(coordinates.y * 100).toFixed(1)}%)</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-2">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isSubmitting}
              maxLength={200}
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              {title.length}/200 characters
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Default Checklist</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
                <span>Review specifications</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
                <span>Prepare materials</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
                <span>Set up work area</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
                <span>Execute task</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
                <span>Quality check</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
                <span>Clean up</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              A standard checklist will be added to this task. You can modify items after creation.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-gray-400 transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;
