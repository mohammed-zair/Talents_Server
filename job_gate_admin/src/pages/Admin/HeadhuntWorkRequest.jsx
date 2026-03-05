import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiStar } from 'react-icons/fi';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const defaultFilters = {
  search: '',
  cv_power_min: '',
  cv_power_max: '',
  skills: '',
  experience_min: '',
  experience_max: '',
  education_level: '',
  location: '',
  ai_strengths: '',
  ai_weaknesses: '',
  sort: 'cv_power_desc',
};

const tagClass =
  'inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700';

const HeadhuntWorkRequest = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [request, setRequest] = useState(location.state?.request || null);
  const [loadingRequest, setLoadingRequest] = useState(!location.state?.request);
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedFilters, setFeedFilters] = useState(defaultFilters);
  const [candidateDrafts, setCandidateDrafts] = useState({});
  const [error, setError] = useState('');
  const [aiModalCandidate, setAiModalCandidate] = useState(null);

  const numericRequestId = Number(requestId);

  const fetchRequestDetail = useCallback(async () => {
    if (!numericRequestId) return;
    try {
      setLoadingRequest(true);
      setError('');
      const response = await axiosInstance.get(`/admin/headhunt-requests/${numericRequestId}`);
      const payload = extractData(response);
      setRequest(payload || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load request details.');
    } finally {
      setLoadingRequest(false);
    }
  }, [numericRequestId]);

  const fetchFeed = useCallback(async (filters = defaultFilters) => {
    if (!numericRequestId) return;
    try {
      setFeedLoading(true);
      setError('');
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => String(value || '').trim() !== '')
      );
      const response = await axiosInstance.get(`/admin/headhunt-requests/${numericRequestId}/candidate-feed`, { params });
      const payload = extractData(response);
      setFeedItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load candidate feed.');
      setFeedItems([]);
    } finally {
      setFeedLoading(false);
    }
  }, [numericRequestId]);

  useEffect(() => {
    if (!request) {
      fetchRequestDetail();
    }
    fetchFeed(defaultFilters);
  }, [fetchFeed, fetchRequestDetail, request]);

  const addCandidateToRequest = async (candidate, status = 'selected') => {
    const draft = candidateDrafts[candidate.user_id] || {};

    try {
      setError('');
      await axiosInstance.post(`/admin/headhunt-requests/${numericRequestId}/candidates`, {
        user_id: candidate.user_id,
        cv_id: candidate.cv_id,
        status,
        notes: draft.notes || '',
        why_candidate: draft.why_candidate || candidate.ai_summary || '',
        source_ai_snapshot: {
          summary: candidate.ai_summary,
          strengths: candidate.ai_strengths,
          weaknesses: candidate.ai_weaknesses,
          skills: candidate.skills,
          cv_power: candidate.cv_power,
        },
      });
      fetchFeed(feedFilters);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add candidate.');
    }
  };

  return (
    <div className="m-2 mt-24 rounded-3xl bg-white p-2 md:m-10 md:p-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Header category="Admin" title={`Work on Request #${numericRequestId || '-'}`} />
        <button
          type="button"
          onClick={() => navigate('/cv-requests')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FiArrowLeft /> Back to Pipeline
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loadingRequest ? (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">Loading request details...</div>
      ) : (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-xl font-semibold text-gray-900">{request?.requested_role || '-'}</h3>
          <p className="text-sm text-gray-600">
            {request?.Company?.name || request?.company?.name || '-'}
            {' '}• {request?.location || 'Any location'}
            {' '}• Need {request?.cv_count || 0} head
          </p>
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 md:grid-cols-5">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Search candidate/job/location" value={feedFilters.search} onChange={(e) => setFeedFilters((prev) => ({ ...prev, search: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="CV Power min" value={feedFilters.cv_power_min} onChange={(e) => setFeedFilters((prev) => ({ ...prev, cv_power_min: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="CV Power max" value={feedFilters.cv_power_max} onChange={(e) => setFeedFilters((prev) => ({ ...prev, cv_power_max: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Skills (React, Node)" value={feedFilters.skills} onChange={(e) => setFeedFilters((prev) => ({ ...prev, skills: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Location" value={feedFilters.location} onChange={(e) => setFeedFilters((prev) => ({ ...prev, location: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Experience min" value={feedFilters.experience_min} onChange={(e) => setFeedFilters((prev) => ({ ...prev, experience_min: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Experience max" value={feedFilters.experience_max} onChange={(e) => setFeedFilters((prev) => ({ ...prev, experience_max: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Education level" value={feedFilters.education_level} onChange={(e) => setFeedFilters((prev) => ({ ...prev, education_level: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="AI strengths" value={feedFilters.ai_strengths} onChange={(e) => setFeedFilters((prev) => ({ ...prev, ai_strengths: e.target.value }))} />
        <div className="flex gap-2">
          <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="AI weaknesses" value={feedFilters.ai_weaknesses} onChange={(e) => setFeedFilters((prev) => ({ ...prev, ai_weaknesses: e.target.value }))} />
          <button
            type="button"
            onClick={() => fetchFeed(feedFilters)}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {feedLoading ? (
          <div className="col-span-2 py-10 text-center text-gray-500">Loading candidate feed...</div>
        ) : feedItems.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">No candidates match the current filters.</div>
        ) : (
          feedItems.map((candidate) => {
            const draft = candidateDrafts[candidate.user_id] || {};
            return (
              <div key={`${candidate.user_id}-${candidate.cv_id}`} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{candidate.full_name}</h4>
                    <p className="text-sm text-gray-600">{candidate.email || '-'} - {candidate.location || 'Unknown location'}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-wide text-emerald-600">CV Power</p>
                    <p className="text-xl font-bold text-emerald-700">{candidate.cv_power ?? '-'}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(candidate.skills || []).slice(0, 8).map((skill) => (
                    <span key={skill} className={tagClass}>{skill}</span>
                  ))}
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-gray-700">{candidate.ai_summary || 'No AI summary available.'}</p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Why this candidate"
                    value={draft.why_candidate || ''}
                    onChange={(e) =>
                      setCandidateDrafts((prev) => ({
                        ...prev,
                        [candidate.user_id]: { ...prev[candidate.user_id], why_candidate: e.target.value },
                      }))
                    }
                  />
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Admin note"
                    value={draft.notes || ''}
                    onChange={(e) =>
                      setCandidateDrafts((prev) => ({
                        ...prev,
                        [candidate.user_id]: { ...prev[candidate.user_id], notes: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAiModalCandidate(candidate)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FiBriefcase /> Open AI Insights
                  </button>
                  <button
                    type="button"
                    onClick={() => addCandidateToRequest(candidate, 'selected')}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    <FiStar /> Add as Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => addCandidateToRequest(candidate, 'rejected_by_company')}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    Reject for This Request
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {aiModalCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">AI Insights - {aiModalCandidate.full_name}</h3>
                <p className="text-sm text-gray-600">CV Power {aiModalCandidate.cv_power ?? '-'}</p>
              </div>
              <button type="button" onClick={() => setAiModalCandidate(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase text-emerald-700">CV Power</p>
                <p className="text-3xl font-bold text-emerald-800">{aiModalCandidate.cv_power ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs uppercase text-indigo-700">ATS Score</p>
                <p className="text-3xl font-bold text-indigo-800">{aiModalCandidate.candidate_ats_score ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <p className="text-xs uppercase text-cyan-700">Experience</p>
                <p className="text-3xl font-bold text-cyan-800">{aiModalCandidate.total_years_experience ?? 0}y</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Contextual Summary</p>
              <p className="mt-2 text-sm text-gray-700">{aiModalCandidate.ai_summary || 'No AI summary available.'}</p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Top Strengths</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {(aiModalCandidate.ai_strengths || []).slice(0, 6).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Key Risks</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {(aiModalCandidate.ai_weaknesses || []).slice(0, 6).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadhuntWorkRequest;