import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const statusOptions = ['pending', 'reviewed', 'accepted', 'rejected'];

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeApp, setActiveApp] = useState(null);
  const [reviewData, setReviewData] = useState({ status: 'pending', review_notes: '' });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/applications');
      const payload = extractData(response);
      setApplications(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openReview = (application) => {
    setActiveApp(application);
    setReviewData({
      status: application.status || 'pending',
      review_notes: application.review_notes || '',
    });
  };

  const closeReview = () => {
    setActiveApp(null);
    setReviewData({ status: 'pending', review_notes: '' });
  };

  const updateStatus = async () => {
    if (!activeApp) return;
    try {
      await axiosInstance.put(`/admin/applications/${activeApp.application_id}`, reviewData);
      fetchApplications();
      closeReview();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update application.');
    }
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Applications" />

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchApplications}
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
        <div className="text-center py-10">Loading applications...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Job</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Applicant</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.application_id} className="border-b">
                  <td className="px-4 py-3">{app.application_id}</td>
                  <td className="px-4 py-3">{app.JobPosting?.title || '-'}</td>
                  <td className="px-4 py-3">{app.JobPosting?.Company?.name || '-'}</td>
                  <td className="px-4 py-3">{app.User?.full_name || '-'}</td>
                  <td className="px-4 py-3 capitalize">{app.status}</td>
                  <td className="px-4 py-3">
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openReview(app)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeApp && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-2">Review Application</h3>
            <p className="text-sm text-gray-500 mb-4">
              {activeApp.JobPosting?.title} • {activeApp.User?.full_name}
            </p>
            <div className="grid grid-cols-1 gap-4">
              <select
                value={reviewData.status}
                onChange={(e) => setReviewData((prev) => ({ ...prev, status: e.target.value }))}
                className="border rounded px-3 py-2"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <textarea
                rows="4"
                value={reviewData.review_notes}
                onChange={(e) => setReviewData((prev) => ({ ...prev, review_notes: e.target.value }))}
                className="border rounded px-3 py-2"
                placeholder="Add review notes"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={closeReview}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
