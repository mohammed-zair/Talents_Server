import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const PUSH_TEMPLATES = {
  welcome: {
    label: 'Welcome',
    en: {
      title: 'Welcome to Talents We Trust',
      message: 'Your profile is active. Complete your CV and start exploring roles tailored for you.',
    },
    ar: {
      title: 'أهلاً بك في Talents We Trust',
      message: 'تم تفعيل حسابك. أكمل سيرتك الذاتية وابدأ استكشاف الوظائف المناسبة لك.',
    },
  },
  application_update: {
    label: 'Application Update',
    en: {
      title: 'Your application status was updated',
      message: 'Your job application has moved to the next stage. Open the app to view details.',
    },
    ar: {
      title: 'تم تحديث حالة طلبك',
      message: 'تم نقل طلب التوظيف الخاص بك إلى مرحلة جديدة. افتح التطبيق لمعرفة التفاصيل.',
    },
  },
  interview_invite: {
    label: 'Interview Invite',
    en: {
      title: 'Interview Invitation',
      message: 'Great news! You are invited for an interview. Please check your email for scheduling details.',
    },
    ar: {
      title: 'دعوة لمقابلة عمل',
      message: 'خبر ممتاز! تمت دعوتك إلى مقابلة عمل. يرجى مراجعة بريدك الإلكتروني لتفاصيل الموعد.',
    },
  },
};

const Push = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templateKey, setTemplateKey] = useState('welcome');
  const [formData, setFormData] = useState({
    target_user_id: '',
    title: '',
    message: '',
  });

  const applyTemplate = () => {
    const template = PUSH_TEMPLATES[templateKey]?.[templateLanguage];
    if (!template) return;
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      message: template.message,
    }));
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/push');
      const payload = extractData(response);
      setLogs(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load push logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/admin/users');
      const payload = extractData(response);
      setUsers(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendPush = async () => {
    try {
      setSending(true);
      setError(null);

      if (!formData.target_user_id || !formData.title || !formData.message) {
        setError('User, title, and message are required.');
        return;
      }

      await axiosInstance.post('/admin/push/send', {
        target_user_id: Number(formData.target_user_id),
        title: formData.title,
        message: formData.message,
      });

      setFormData({ target_user_id: '', title: '', message: '' });
      fetchLogs();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send push notification.');
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const haystack = [
      log.User?.full_name,
      log.User?.email,
      log.title,
      log.message,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'sent' && log.is_sent)
      || (statusFilter === 'failed' && !log.is_sent);
    return matchesSearch && matchesStatus;
  });

  const visibleLogs = showAllLogs ? filteredLogs : filteredLogs.slice(0, 6);

  useEffect(() => {
    setShowAllLogs(false);
  }, [searchTerm, statusFilter]);

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Push Center" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-gray-50 rounded-2xl p-6 border">
          <h3 className="text-lg font-semibold mb-4">Send Push</h3>

          <div className="grid grid-cols-1 gap-2 mb-3">
            <select
              value={templateLanguage}
              onChange={(event) => setTemplateLanguage(event.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="en">Template Language: English</option>
              <option value="ar">Template Language: Arabic</option>
            </select>
            <div className="flex gap-2">
              <select
                value={templateKey}
                onChange={(event) => setTemplateKey(event.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {Object.entries(PUSH_TEMPLATES).map(([key, template]) => (
                  <option key={key} value={key}>
                    Template: {template.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyTemplate}
                className="shrink-0 rounded px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Use
              </button>
            </div>
          </div>

          <select
            name="target_user_id"
            value={formData.target_user_id}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 mb-3"
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.full_name || user.email} (#{user.user_id})
              </option>
            ))}
          </select>

          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Title"
            className="w-full border rounded px-3 py-2 mb-3"
          />
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Message"
            rows="5"
            className="w-full border rounded px-3 py-2"
          />

          <button
            type="button"
            onClick={sendPush}
            disabled={sending}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Push'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Recent Push Notifications</h3>
              <p className="text-sm text-gray-500">
                Showing {Math.min(visibleLogs.length, filteredLogs.length)} of {filteredLogs.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search logs"
                className="border rounded px-3 py-1 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <button
                type="button"
                onClick={fetchLogs}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10">Loading logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Message</th>
                    <th className="px-4 py-3 text-left">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log) => (
                    <tr key={log.push_id || log.id} className="border-b">
                      <td className="px-4 py-3">
                        {log.User?.full_name || log.User?.email || log.user_id}
                      </td>
                      <td className="px-4 py-3">{log.title}</td>
                      <td className="px-4 py-3">{log.message}</td>
                      <td className="px-4 py-3">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {visibleLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                        No push logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filteredLogs.length > 6 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllLogs((prev) => !prev)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                {showAllLogs ? 'Show Less' : 'View All'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Push;
