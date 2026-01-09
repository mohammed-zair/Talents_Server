import React, { useEffect, useState } from 'react';
import { FaBell, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaMoneyCheckAlt } from 'react-icons/fa';
import { MdOutlineCancel } from 'react-icons/md';

import { useStateContext } from '../contexts/ContextProvider';
import axiosInstance from '../utils/axiosConfig';
import Button from './Button';

const Notification = () => {
  const { currentColor, handleClick } = useStateContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/system/notifications/');
      setNotifications(response.data);
    } catch (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axiosInstance.patch(`/system/notifications/${notificationId}/`, {
        is_read: true,
      });

      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (markError) {
      console.error('Error marking notification as read:', markError);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updatePromises = notifications
        .filter((notif) => !notif.is_read)
        .map((notif) => axiosInstance.patch(`/system/notifications/${notif.id}/`, {
          is_read: true,
        }));

      await Promise.all(updatePromises);

      setNotifications([]);
    } catch (markAllError) {
      console.error('Error marking all notifications as read:', markAllError);
    }
  };

  const getNotificationIcon = (title, message) => {
    const titleLower = title?.toLowerCase() || '';
    const messageLower = message?.toLowerCase() || '';

    if (titleLower.includes('warning') || titleLower.includes('error') || messageLower.includes('failed')) {
      return <FaExclamationTriangle className="text-yellow-500 text-lg" />;
    }
    if (titleLower.includes('success') || titleLower.includes('approved') || messageLower.includes('successful')) {
      return <FaCheckCircle className="text-green-500 text-lg" />;
    }
    if (titleLower.includes('payment') || titleLower.includes('transaction') || messageLower.includes('payment')) {
      return <FaMoneyCheckAlt className="text-blue-500 text-lg" />;
    }
    return <FaInfoCircle className="text-gray-500 text-lg" />;
  };

  const getPriorityBadge = (title, message) => {
    const titleLower = title?.toLowerCase() || '';
    const messageLower = message?.toLowerCase() || '';

    if (titleLower.includes('urgent') || titleLower.includes('critical') || messageLower.includes('immediately')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-red-100 text-red-800">High</span>;
    }
    if (titleLower.includes('important') || messageLower.includes('attention')) {
      return <span className="text-xs rounded-full px-2 py-1 bg-yellow-100 text-yellow-800">Medium</span>;
    }
    return <span className="text-xs rounded-full px-2 py-1 bg-green-100 text-green-800">Low</span>;
  };

  const getTimeAgo = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getBorderColor = (title, message) => {
    const titleLower = title?.toLowerCase() || '';
    const messageLower = message?.toLowerCase() || '';

    if (titleLower.includes('warning') || titleLower.includes('error') || messageLower.includes('failed')) {
      return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    }
    if (titleLower.includes('success') || titleLower.includes('approved') || messageLower.includes('successful')) {
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
    }
    if (titleLower.includes('payment') || titleLower.includes('transaction')) {
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
    return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
  };

  const requiresAction = (title, message) => {
    const titleLower = title?.toLowerCase() || '';
    const messageLower = message?.toLowerCase() || '';

    return titleLower.includes('approve')
      || titleLower.includes('review')
      || messageLower.includes('action required')
      || messageLower.includes('pending');
  };

  const unreadCount = notifications.filter((notif) => !notif.is_read).length;

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
            onClick={fetchNotifications}
            className="mt-2 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-8">
          <FaBell className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No notifications</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            You&apos;re all caught up!
          </p>
        </div>
      );
    }

    return (
      <>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-4 p-3 rounded-lg mb-2 border-l-4 cursor-pointer hover:opacity-80 transition-opacity ${
              getBorderColor(notification.title, notification.message)
            } ${notification.is_read ? 'opacity-60' : ''}`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.title, notification.message)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold dark:text-gray-200 text-sm">
                  {notification.title}
                </p>
                {getPriorityBadge(notification.title, notification.message)}
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-xs mb-2">
                {notification.message}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  {getTimeAgo(notification.created_at)}
                </span>
                {requiresAction(notification.title, notification.message) && (
                  <span className="text-red-500 text-xs font-semibold">
                    Action Required
                  </span>
                )}
                {notification.is_read && (
                  <span className="text-green-500 text-xs">Read</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="nav-item absolute right-5 md:right-40 top-16 bg-white dark:bg-[#42464D] p-8 rounded-lg w-96 shadow-xl z-50">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3 items-center">
          <FaBell className="text-xl text-gray-600 dark:text-gray-300" />
          <p className="font-semibold text-lg dark:text-gray-200">System Notifications</p>
          {unreadCount > 0 && (
            <button type="button" className="text-white text-xs rounded p-1 px-2 bg-orange-500">
              {unreadCount} New
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleClick('notification')}
          className="text-2xl p-3 hover:bg-light-gray rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          <MdOutlineCancel />
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 transition-colors"
          >
            Mark all as read
          </button>
        </div>
      )}

      <div className="mt-3 max-h-80 overflow-y-auto">
        {renderContent()}

        {notifications.length > 0 && (
          <div className="mt-5">
            <Button
              color="white"
              bgColor={currentColor}
              text="See All Notifications"
              borderRadius="10px"
              width="full"
              onClick={() => {
                console.log('Navigate to full notifications page');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;
