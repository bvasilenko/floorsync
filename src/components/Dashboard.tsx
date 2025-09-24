import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">FloorSync</h1>
              </div>
            </div>
            <div className="flex items-center">
              <button className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
            {/* Task List */}
            <div className="lg:col-span-4 mb-6 lg:mb-0">
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Tasks</h2>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <h3 className="font-medium text-gray-900">Sample Task 1</h3>
                      <p className="text-sm text-gray-500">Standard Construction Task</p>
                    </div>
                  </div>
                  <button className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
                    + Add New Task
                  </button>
                </div>
              </div>
            </div>

            {/* Floor Plan */}
            <div className="lg:col-span-8">
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Floor Plan</h2>
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Floor plan will be displayed here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
