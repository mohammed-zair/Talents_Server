import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const JobPostings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [activeJobLoading, setActiveJobLoading] = useState(false);

  const openPreview = async (jobId) => {
    try {
      setActiveJobLoading(true);
      const response = await axiosInstance.get(`/admin/job-postings/${jobId}`);
      const payload = extractData(response);
      setActiveJob(payload);
    } catch (err) {
      setError('Failed to load job preview.');
    } finally {
      setActiveJobLoading(false);
    }
  };

  const closePreview = () => setActiveJob(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/job-postings');
      const payload = extractData(response);
      setJobs(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load job postings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Job Postings" />

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchJobs}
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
        <div className="text-center py-10">Loading job postings...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Industry</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Form Type</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id} className="border-b">
                  <td className="px-4 py-3">{job.job_id}</td>
                  <td className="px-4 py-3">{job.title}</td>
                  <td className="px-4 py-3">{job.Company?.name || '-'}</td>
                  <td className="px-4 py-3">{job.industry || '-'}</td>
                  <td className="px-4 py-3 capitalize">{job.status}</td>
                  <td className="px-4 py-3">{job.form_type || '-'}</td>
                  <td className="px-4 py-3">
                    {job.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openPreview(job.job_id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                    No job postings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(activeJob || activeJobLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Job Preview</h3>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-md border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {activeJobLoading ? (
              <div className="py-12 text-center text-gray-500">Loading preview...</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Title</p>
                    <p className="font-semibold text-gray-900">{activeJob?.job?.title || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="font-semibold text-gray-900">{activeJob?.job?.Company?.name || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Applicants</p>
                    <p className="font-semibold text-gray-900">{activeJob?.analytics?.total_applications ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-semibold capitalize text-gray-900">{activeJob?.job?.status || '-'}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {activeJob?.job?.description || '-'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Requirements</p>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {activeJob?.job?.requirements || '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-gray-900">Applicants</p>
                    <Link
                      to={`/job-postings/${activeJob?.job?.job_id}`}
                      className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Open Full Applicants View
                    </Link>
                  </div>
                  <div className="max-h-56 overflow-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeJob?.job?.Applications || []).map((app) => (
                          <tr key={app.application_id} className="border-t">
                            <td className="px-3 py-2">{app?.User?.full_name || '-'}</td>
                            <td className="px-3 py-2">{app?.User?.email || '-'}</td>
                            <td className="px-3 py-2 capitalize">{app?.status || '-'}</td>
                          </tr>
                        ))}
                        {(activeJob?.job?.Applications || []).length === 0 && (
                          <tr>
                            <td colSpan="3" className="px-3 py-4 text-center text-gray-500">
                              No applicants yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostings;
