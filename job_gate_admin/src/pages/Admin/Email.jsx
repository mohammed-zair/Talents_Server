import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const Email = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('direct');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    recipient: '',
    subject: '',
    body: '',
    target_company_id: '',
    recipient_email: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/email');
      const payload = extractData(response);
      setLogs(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load email logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendEmail = async () => {
    try {
      setSending(true);
      setError(null);

      if (!formData.subject || !formData.body) {
        setError('Subject and body are required.');
        return;
      }

      if (mode === 'company') {
        if (!formData.target_company_id) {
          setError('Company ID is required.');
          return;
        }
        await axiosInstance.post('/email/send', {
          target_company_id: Number(formData.target_company_id),
          recipient_email: formData.recipient_email || undefined,
          subject: formData.subject,
          body: formData.body,
        });
      } else {
        if (!formData.recipient) {
          setError('Recipient email is required.');
          return;
        }
        await axiosInstance.post('/admin/email/send', {
          recipient: formData.recipient,
          subject: formData.subject,
          body: formData.body,
        });
      }

      setFormData({
        recipient: '',
        subject: '',
        body: '',
        target_company_id: '',
        recipient_email: '',
      });
      fetchLogs();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status) => {
    if (status === 'sent') return 'bg-green-100 text-green-700';
    if (status === 'failed') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const filteredLogs = logs.filter((log) => {
    const haystack = [
      log.recipient_email,
      log.subject,
      log.Company?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Email Center" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-gray-50 rounded-2xl p-6 border">
          <h3 className="text-lg font-semibold mb-4">Send Email</h3>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`px-3 py-1 rounded-full text-sm ${
                mode === 'direct' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'
              }`}
            >
              Direct
            </button>
            <button
              type="button"
              onClick={() => setMode('company')}
              className={`px-3 py-1 rounded-full text-sm ${
                mode === 'company' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'
              }`}
            >
              Company
            </button>
          </div>

          {mode === 'company' ? (
            <div className="space-y-3">
              <input
                name="target_company_id"
                value={formData.target_company_id}
                onChange={handleChange}
                placeholder="Company ID"
                className="w-full border rounded px-3 py-2"
              />
              <input
                name="recipient_email"
                value={formData.recipient_email}
                onChange={handleChange}
                placeholder="Override recipient email (optional)"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ) : (
            <input
              name="recipient"
              value={formData.recipient}
              onChange={handleChange}
              placeholder="Recipient email"
              className="w-full border rounded px-3 py-2 mb-3"
            />
          )}

          <input
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Subject"
            className="w-full border rounded px-3 py-2 mt-3"
          />
          <textarea
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder="Email body"
            rows="5"
            className="w-full border rounded px-3 py-2 mt-3"
          />

          <button
            type="button"
            onClick={sendEmail}
            disabled={sending}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Recent Emails</h3>
              <p className="text-sm text-gray-500">Latest 50 messages</p>
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
                <option value="pending">Pending</option>
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
                    <th className="px-4 py-3 text-left">Recipient</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.email_id || log.id} className="border-b">
                      <td className="px-4 py-3">{log.recipient_email}</td>
                      <td className="px-4 py-3">{log.Company?.name || '-'}</td>
                      <td className="px-4 py-3">{log.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusBadge(log.status)}`}>
                          {log.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                        No email logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Email;
