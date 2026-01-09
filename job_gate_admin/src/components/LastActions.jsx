import React, { useState, useEffect } from 'react';
import { MdOutlineCancel, MdHistory, MdPerson, MdAdminPanelSettings } from 'react-icons/md';
import { FaUserShield, FaUserCheck, FaUserTimes, FaMoneyBillWave } from 'react-icons/fa';
import Button from './Button';
import { useStateContext } from '../contexts/ContextProvider';
import axiosInstance from '../utils/axiosConfig';

const LastActions = () => {
  const { currentColor } = useStateContext();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminActions();
  }, []);

  const fetchAdminActions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/system/admin-actions/');
      setActions(response.data);
    } catch (fetchError) {
      console.error('Error fetching admin actions:', fetchError);
      setError('Failed to load admin actions');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType, description) => {
    const actionLower = actionType?.toLowerCase() || '';
    const descLower = description?.toLowerCase() || '';

    if (actionLower.includes('ban') || descLower.includes('ban') || descLower.includes('banned')) {
      return <FaUserTimes className="text-red-500 text-lg" />;
    }
    if (actionLower.includes('unban') || descLower.includes('unban') || descLower.includes('unbanned')) {
      return <FaUserCheck className="text-green-500 text-lg" />;
    }
    if (actionLower.includes('promote') || descLower.includes('promote') || descLower.includes('admin')) {
      return <MdAdminPanelSettings className="text-purple-500 text-lg" />;
    }
    if (actionLower.includes('payment') || descLower.includes('payment') || descLower.includes('approve')) {
      return <FaMoneyBillWave className="text-blue-500 text-lg" />;
    }
    if (actionLower.includes('user') || descLower.includes('user')) {
      return <MdPerson className="text-orange-500 text-lg" />;
    }
    return <MdHistory className="text-gray-500 text-lg" />;
  };

  const getActionColor = (actionType, description) => {
    const actionLower = actionType?.toLowerCase() || '';
    const descLower = description?.toLowerCase() || '';

    if (actionLower.includes('ban') || descLower.includes('ban')) {
      return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
    }
    if (actionLower.includes('unban') || descLower.includes('unban')) {
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
    }
    if (actionLower.includes('promote') || descLower.includes('promote')) {
      return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20';
    }
    if (actionLower.includes('payment') || descLower.includes('payment')) {
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
    return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
  };

  const getActionTypeBadge = (actionType, description) => {
    const actionLower = actionType?.toLowerCase() || '';
    const descLower = description?.toLowerCase() || '';

    if (actionLower.includes('ban') || descLower.includes('ban')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-red-100 text-red-800">User Ban</span>;
    }
    if (actionLower.includes('unban') || descLower.includes('unban')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-green-100 text-green-800">User Unban</span>;
    }
    if (actionLower.includes('promote') || descLower.includes('promote')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-purple-100 text-purple-800">Promotion</span>;
    }
    if (actionLower.includes('post') || actionLower.includes('create')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-800">Create</span>;
    }
    if (actionLower.includes('put') || actionLower.includes('update')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-yellow-100 text-yellow-800">Update</span>;
    }
    if (actionLower.includes('delete')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-red-100 text-red-800">Delete</span>;
    }
    return <span className="text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-800">Action</span>;
  };

  const getTimeAgo = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return created.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatActionDescription = (description) => {
    if (!description) return 'No description available';

    try {
      const parsed = JSON.parse(description);
      if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      }
      return String(parsed);
    } catch {
      return description.length > 100
        ? `${description.substring(0, 100)}...`
        : description;
    }
  };

  const getTodayActionsCount = () => {
    const today = new Date();
    return actions.filter((action) => {
      const actionDate = new Date(action.created_at);
      return actionDate.toDateString() === today.toDateString();
    }).length;
  };

  const getThisWeekActionsCount = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return actions.filter((action) => {
      const actionDate = new Date(action.created_at);
      return actionDate > weekAgo;
    }).length;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchAdminActions}
            className="mt-2 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (actions.length === 0) {
      return (
        <div className="text-center py-8">
          <MdHistory className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No recent actions</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Admin activities will appear here
          </p>
        </div>
      );
    }

    return actions.map((action) => (
      <div
        key={action.id}
        className={`flex items-start gap-4 p-3 rounded-lg mb-3 border-l-4 ${
          getActionColor(action.action_type, action.description)
        }`}
      >
        <div className="flex-shrink-0 mt-1">
          {getActionIcon(action.action_type, action.description)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold dark:text-gray-200 text-sm">
                {action.admin_name || 'System Admin'}
              </p>
              {action.target_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Target: {action.target_name}
                </p>
              )}
            </div>
            {getActionTypeBadge(action.action_type, action.description)}
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-xs mb-2">
            {formatActionDescription(action.description)}
          </p>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 dark:text-gray-500 text-xs">
              {getTimeAgo(action.created_at)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {action.action_type?.split(' ')[0] || 'Action'}
            </span>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="nav-item absolute right-5 md:right-40 top-16 bg-white dark:bg-[#42464D] p-8 rounded-lg w-96 shadow-xl z-50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3 items-center">
          <FaUserShield className="text-xl text-gray-600 dark:text-gray-300" />
          <div>
            <p className="font-semibold text-lg dark:text-gray-200">Admin Actions</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Recent administrative activities</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-2xl p-3 hover:bg-light-gray rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          <MdOutlineCancel />
        </button>
      </div>

      <div className="mt-4 max-h-80 overflow-y-auto">
        {renderContent()}
      </div>

      {actions.length > 0 && (
        <div className="mt-6">
          <Button
            color="white"
            bgColor={currentColor}
            text="Refresh Actions"
            borderRadius="10px"
            width="full"
            onClick={fetchAdminActions}
          />
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="font-semibold text-gray-800 dark:text-white">{actions.length}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
            <p className="font-semibold text-gray-800 dark:text-white">
              {getTodayActionsCount()}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
            <p className="font-semibold text-gray-800 dark:text-white">
              {getThisWeekActionsCount()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LastActions;
