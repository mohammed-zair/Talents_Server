import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiMessageSquare, FiRefreshCw, FiSearch, FiSend, FiUsers } from 'react-icons/fi';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const requestStatusOptions = ['pending', 'approved', 'processing', 'delivered', 'closed', 'rejected'];
const candidateStatusOptions = ['selected', 'contacting', 'submitted_to_company', 'accepted_by_company', 'rejected_by_company'];

const HeadhuntPipeline = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [shortlistRequest, setShortlistRequest] = useState(null);
  const [shortlistItems, setShortlistItems] = useState([]);
  const [shortlistLoading, setShortlistLoading] = useState(false);

  const [updateRequest, setUpdateRequest] = useState(null);
  const [updateSending, setUpdateSending] = useState(false);
  const [updatePayload, setUpdatePayload] = useState({
    language: 'en',
    message_type: 'progress_update',
    custom_intro: '',
    include_why_candidate: true,
  });

  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);
      setError('');
      const response = await axiosInstance.get('/admin/headhunt-requests');
      const payload = extractData(response);
      setRequests(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load Headhunt Pipeline requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateRequestStatus = async (requestId, status) => {
    try {
      setError('');
      await axiosInstance.put(`/admin/headhunt-requests/${requestId}/status`, { status });
      fetchRequests(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update request status.');
    }
  };

  const openShortlist = async (request) => {
    setShortlistRequest(request);
    setShortlistLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(`/admin/headhunt-requests/${request.request_id}/candidates`);
      const payload = extractData(response);
      setShortlistItems(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load selected candidates.');
      setShortlistItems([]);
    } finally {
      setShortlistLoading(false);
    }
  };

  const updateShortlistCandidate = async (candidateId, patch) => {
    if (!shortlistRequest) return;
    try {
      setError('');
      await axiosInstance.patch(
        `/admin/headhunt-requests/${shortlistRequest.request_id}/candidates/${candidateId}`,
        patch
      );
      openShortlist(shortlistRequest);
      fetchRequests(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update candidate.');
    }
  };

  const sendCompanyUpdate = async () => {
    if (!updateRequest) return;
    try {
      setUpdateSending(true);
      setError('');
      await axiosInstance.post(`/admin/headhunt-requests/${updateRequest.request_id}/company-update`, updatePayload);
      setUpdateRequest(null);
      setUpdatePayload({
        language: 'en',
        message_type: 'progress_update',
        custom_intro: '',
        include_why_candidate: true,
      });
      fetchRequests(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send company update.');
    } finally {
      setUpdateSending(false);
    }
  };

  const requestKpis = useMemo(() => {
    const total = requests.length;
    const processing = requests.filter((item) => item.status === 'processing').length;
    const delivered = requests.filter((item) => item.status === 'delivered').length;
    const pending = requests.filter((item) => item.status === 'pending').length;
    return { total, processing, delivered, pending };
  }, [requests]);

  return (
    <div className="m-2 mt-24 rounded-3xl bg-white p-2 md:m-10 md:p-10">
      <Header category="Admin" title="Headhunt Pipeline" />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[{
          label: 'Total Requests',
          value: requestKpis.total,
        }, {
          label: 'Pending',
          value: requestKpis.pending,
        }, {
          label: 'In Progress',
          value: requestKpis.processing,
        }, {
          label: 'Delivered',
          value: requestKpis.delivered,
        }].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? '...' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => fetchRequests()}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-10 text-center">Loading headhunt requests...</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.request_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">Request #{request.request_id}</p>
                  <h3 className="text-lg font-semibold text-gray-900">{request.requested_role}</h3>
                  <p className="text-sm text-gray-600">
                    {request.Company?.name || '-'} - {request.location || 'Any location'} - Need {request.cv_count} CVs
                  </p>
                </div>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">
                  {request.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  value={request.status}
                  onChange={(e) => updateRequestStatus(request.request_id, e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {requestStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => navigate(`/cv-requests/${request.request_id}/work`, { state: { request } })}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <FiSearch /> Work on Request
                </button>
                <button
                  type="button"
                  onClick={() => openShortlist(request)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <FiUsers /> Candidates
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateRequest(request)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  <FiSend /> Send Company Update
                </button>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
              No headhunt requests found.
            </div>
          )}
        </div>
      )}

      {shortlistRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Candidates - Request #{shortlistRequest.request_id}</h3>
                <p className="text-sm text-gray-600">{shortlistRequest.requested_role}</p>
              </div>
              <button type="button" onClick={() => setShortlistRequest(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
            </div>

            {shortlistLoading ? (
              <div className="py-10 text-center text-gray-500">Loading candidates...</div>
            ) : shortlistItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">No candidates selected yet.</div>
            ) : (
              <div className="space-y-3">
                {shortlistItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{item.User?.full_name || 'Candidate'}</p>
                        <p className="text-sm text-gray-600">{item.User?.email || '-'} - CV #{item.cv_id || '-'}</p>
                      </div>
                      <select
                        value={item.status}
                        onChange={(e) => updateShortlistCandidate(item.id, { status: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {candidateStatusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <input
                        defaultValue={item.priority_rank ?? ''}
                        placeholder="Priority rank"
                        className="rounded-lg border px-3 py-2 text-sm"
                        onBlur={(e) => updateShortlistCandidate(item.id, { priority_rank: e.target.value })}
                      />
                      <input
                        defaultValue={item.notes || ''}
                        placeholder="Notes"
                        className="rounded-lg border px-3 py-2 text-sm"
                        onBlur={(e) => updateShortlistCandidate(item.id, { notes: e.target.value })}
                      />
                    </div>

                    <textarea
                      defaultValue={item.why_candidate || ''}
                      placeholder="Why this candidate"
                      className="mt-2 min-h-[74px] w-full rounded-lg border px-3 py-2 text-sm"
                      onBlur={(e) => updateShortlistCandidate(item.id, { why_candidate: e.target.value })}
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">ID: {item.id}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">Created: {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {updateRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4">
          <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Send Company Update</h3>
              <button type="button" onClick={() => setUpdateRequest(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
            </div>

            <p className="text-sm text-gray-600">{updateRequest.Company?.name || '-'} - {updateRequest.requested_role}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-gray-700">
                Language
                <select
                  value={updatePayload.language}
                  onChange={(e) => setUpdatePayload((prev) => ({ ...prev, language: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>

              <label className="text-sm text-gray-700">
                Message type
                <select
                  value={updatePayload.message_type}
                  onChange={(e) => setUpdatePayload((prev) => ({ ...prev, message_type: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="progress_update">progress_update</option>
                  <option value="candidate_submitted">candidate_submitted</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block text-sm text-gray-700">
              Custom intro
              <textarea
                value={updatePayload.custom_intro}
                onChange={(e) => setUpdatePayload((prev) => ({ ...prev, custom_intro: e.target.value }))}
                placeholder="Leave empty to use default HR progress template"
                className="mt-1 min-h-[90px] w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={updatePayload.include_why_candidate}
                onChange={(e) => setUpdatePayload((prev) => ({ ...prev, include_why_candidate: e.target.checked }))}
              />
              Include "Why this candidate" section
            </label>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Preview intent</p>
              <p className="mt-1 inline-flex items-center gap-2"><FiMessageSquare /> Push notification + email will be sent together.</p>
              <p className="mt-1 inline-flex items-center gap-2"><FiMail /> Mandatory HR progress message is applied if custom intro is empty.</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setUpdateRequest(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">Cancel</button>
              <button
                type="button"
                onClick={sendCompanyUpdate}
                disabled={updateSending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <FiSend /> {updateSending ? 'Sending...' : 'Send Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadhuntPipeline;
