import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const JobPostingDetail = () => {
  const { id } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(`/admin/job-postings/${id}`);
      const data = extractData(response);
      setPayload(data);
    } catch (err) {
      setError('Failed to load job details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const analytics = payload?.analytics || {};
  const job = payload?.job || {};
  const statusCounts = analytics.status_counts || {};

  const funnel = useMemo(
    () => [
      { label: 'Applied', value: analytics.total_applications || 0, color: '#2563eb' },
      { label: 'Reviewed', value: statusCounts.reviewed || 0, color: '#0ea5e9' },
      { label: 'Shortlisted', value: statusCounts.shortlisted || 0, color: '#22c55e' },
      { label: 'Hired', value: statusCounts.hired || 0, color: '#16a34a' },
    ],
    [analytics, statusCounts]
  );

  const maxFunnel = Math.max(1, ...funnel.map((item) => item.value));

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Job Posting Analytics" />

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchDetails}
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
        <div className="text-center py-10">Loading analytics...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Avg AI Score</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.avg_ai_score ?? '-'}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Avg ATS Score</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.avg_ats_score ?? '-'}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">First Application</p>
              <p className="text-sm font-semibold text-gray-900">
                {analytics.first_application_at
                  ? new Date(analytics.first_application_at).toLocaleDateString()
                  : '-'}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">First High-Quality</p>
              <p className="text-sm font-semibold text-gray-900">
                {analytics.first_high_quality_at
                  ? new Date(analytics.first_high_quality_at).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="p-4 rounded-2xl border border-gray-200">
              <p className="font-semibold text-gray-900">Applicant Funnel</p>
              <div className="mt-4 space-y-3">
                {funnel.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-gray-500">{item.label}</span>
                    <div className="h-3 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${(item.value / maxFunnel) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200">
              <p className="font-semibold text-gray-900">Rising Star</p>
              <div className="mt-3 text-sm text-gray-600">
                {analytics.top_applicant ? (
                  <>
                    <p className="font-semibold text-gray-900">
                      {analytics.top_applicant.candidate?.name || 'Candidate'}
                    </p>
                    <p className="text-xs text-gray-500">Score: {analytics.top_applicant.score ?? '-'}</p>
                  </>
                ) : (
                  <p>No top applicant yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="font-semibold text-gray-900 mb-3">Applicants</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Candidate</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {(job.Applications || []).map((app) => (
                    <tr key={app.application_id} className="border-b">
                      <td className="px-4 py-3">{app.application_id}</td>
                      <td className="px-4 py-3">{app.User?.full_name || '-'}</td>
                      <td className="px-4 py-3">{app.User?.email || '-'}</td>
                      <td className="px-4 py-3 capitalize">{app.status}</td>
                      <td className="px-4 py-3">
                        {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {(job.Applications || []).length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                        No applicants found.
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
  );
};

export default JobPostingDetail;
