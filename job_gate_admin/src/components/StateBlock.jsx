import React from 'react';
import { FiAlertCircle, FiInbox, FiLoader } from 'react-icons/fi';

const icons = {
  loading: <FiLoader className="animate-spin text-2xl" />,
  empty: <FiInbox className="text-2xl" />,
  error: <FiAlertCircle className="text-2xl" />,
};

const StateBlock = ({ variant = 'empty', title, message, actionLabel, onAction }) => {
  return (
    <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex justify-center text-gray-500 mb-3">
        {icons[variant]}
      </div>
      <p className="text-gray-700 font-semibold">{title}</p>
      {message && <p className="text-gray-500 text-sm mt-1">{message}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default StateBlock;
