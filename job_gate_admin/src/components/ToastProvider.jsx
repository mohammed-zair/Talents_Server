import React, { createContext, useContext, useMemo, useState } from 'react';
import { FiCheckCircle, FiInfo, FiXCircle } from 'react-icons/fi';

const ToastContext = createContext();

const iconMap = {
  success: <FiCheckCircle className="text-green-500" />,
  error: <FiXCircle className="text-red-500" />,
  info: <FiInfo className="text-blue-500" />,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const pushToast = (toast) => {
    const id = Date.now();
    const payload = { id, type: 'info', ...toast };
    setToasts((prev) => [...prev, payload]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const value = useMemo(() => ({ pushToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 min-w-[240px]"
          >
            {iconMap[toast.type] || iconMap.info}
            <div className="text-sm text-gray-700">{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
