import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const CVs = () => {
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/cvs');
      const payload = extractData(response);
      setCvs(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load CVs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  const downloadCV = async (userId, cvId) => {
    try {
      setDownloadingId(cvId);
      const response = await axiosInstance.get(`/admin/cvs/${userId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cv_${userId}_${cvId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download CV.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="CV Library" />

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchCVs}
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
        <div className="text-center py-10">Loading CVs...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">CV</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">File Type</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cvs.map((cv) => (
                <tr key={cv.cv_id} className="border-b">
                  <td className="px-4 py-3">{cv.cv_id}</td>
                  <td className="px-4 py-3">{cv.title || '-'}</td>
                  <td className="px-4 py-3">{cv.User?.full_name || '-'}</td>
                  <td className="px-4 py-3">{cv.User?.email || '-'}</td>
                  <td className="px-4 py-3">{cv.file_type || '-'}</td>
                  <td className="px-4 py-3">
                    {cv.created_at ? new Date(cv.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => downloadCV(cv.User?.user_id, cv.cv_id)}
                      disabled={downloadingId === cv.cv_id || !cv.User?.user_id}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      {downloadingId === cv.cv_id ? 'Downloading...' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))}
              {cvs.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                    No CVs found.
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

export default CVs;
