import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const statusOptions = [
  { value: 'pending', label: 'pending', disabled: true },
  { value: 'approved', label: 'approved', disabled: false },
  { value: 'rejected', label: 'rejected', disabled: false },
  { value: 'processed', label: 'processed', disabled: false },
  { value: 'delivered', label: 'delivered', disabled: true },
];

const CVRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [matchingId, setMatchingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/cv-requests');
      const payload = extractData(response);
      setRequests(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load CV requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (requestId, status) => {
    try {
      setUpdatingId(requestId);
      await axiosInstance.put(`/admin/cv-requests/${requestId}/status`, { status });
      fetchRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const runMatching = async (requestId) => {
    try {
      setMatchingId(requestId);
      const response = await axiosInstance.post(`/admin/cv-matching/match/${requestId}`);
      const delivered = response.data?.delivered_count ?? response.data?.message;
      alert(`Matching completed. Delivered: ${delivered}`);
      fetchRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to run CV matching.');
    } finally {
      setMatchingId(null);
    }
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="CV Purchase Requests" />

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchRequests}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading CV requests...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Request</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Experience</th>
                <th className="px-4 py-3 text-left">Skills</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">CV Count</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id} className="border-b">
                  <td className="px-4 py-3">{req.request_id}</td>
                  <td className="px-4 py-3">{req.Company?.name || '-'}</td>
                  <td className="px-4 py-3">{req.requested_role}</td>
                  <td className="px-4 py-3">{req.experience_years || '-'}</td>
                  <td className="px-4 py-3">
                    {Array.isArray(req.skills) ? req.skills.join(', ') : req.skills || '-'}
                  </td>
                  <td className="px-4 py-3">{req.location || '-'}</td>
                  <td className="px-4 py-3">{req.cv_count}</td>
                  <td className="px-4 py-3">
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req.request_id, e.target.value)}
                      className="border rounded px-2 py-1"
                      disabled={updatingId === req.request_id}
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value} disabled={status.disabled}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => runMatching(req.request_id)}
                      disabled={req.status !== 'approved' || matchingId === req.request_id}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      {matchingId === req.request_id ? 'Matching...' : 'Match CVs'}
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                    No CV requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CVRequests;
