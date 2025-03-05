import React from 'react';

interface ApiErrorProps {
  error: string;
}

export const ApiError: React.FC<ApiErrorProps> = ({ error }) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
      <h2 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">
        An error occurred
      </h2>
      <p className="text-red-600 dark:text-red-400">
        {error}
      </p>
    </div>
  );
};
