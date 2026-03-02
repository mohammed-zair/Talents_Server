import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const CompanyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseAssetUrl, setLicenseAssetUrl] = useState('');
  const [licenseMimeType, setLicenseMimeType] = useState('');

  const normalizeApiPath = (url) => {
    if (!url) return '';
    if (url.startsWith('/api/')) return url.slice(4);
    return url;
  };

  const releaseObjectUrl = (url) => {
    if (url) URL.revokeObjectURL(url);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/company-requests');
      const payload = extractData(response);
      setRequests(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load company approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => () => {
    releaseObjectUrl(logoPreviewUrl);
    releaseObjectUrl(licenseAssetUrl);
  }, [logoPreviewUrl, licenseAssetUrl]);

  const openDetails = async (request) => {
    releaseObjectUrl(logoPreviewUrl);
    setLogoPreviewUrl('');
    setActiveRequest(request);
    setRejectNotes(request.admin_review_notes || '');
    setShowDetails(true);
    setCompanyProfile(null);

    setLoadingProfile(true);
    try {
      const response = await axiosInstance.get(`/companies/admin/${request.request_id}`);
      const payload = extractData(response);
      setCompanyProfile(payload || null);
    } catch (err) {
      setCompanyProfile(null);
    } finally {
      setLoadingProfile(false);
    }

    if (request.logo_url) {
      try {
        const response = await axiosInstance.get(normalizeApiPath(request.logo_url), {
          responseType: 'blob',
        });
        const objectUrl = URL.createObjectURL(response.data);
        setLogoPreviewUrl(objectUrl);
      } catch (err) {
        setLogoPreviewUrl('');
      }
    }
  };

  const closeDetails = () => {
    releaseObjectUrl(logoPreviewUrl);
    setLogoPreviewUrl('');
    closeLicenseModal();
    setActiveRequest(null);
    setRejectNotes('');
    setCompanyProfile(null);
    setShowDetails(false);
  };

  const closeLicenseModal = () => {
    releaseObjectUrl(licenseAssetUrl);
    setLicenseAssetUrl('');
    setLicenseMimeType('');
    setLicenseModalOpen(false);
  };

  const openLicenseModal = async () => {
    if (!activeRequest?.license_doc_url) return;
    setLicenseLoading(true);
    try {
      const response = await axiosInstance.get(
        normalizeApiPath(activeRequest.license_doc_url),
        { responseType: 'blob' }
      );
      const mime = response.data?.type || activeRequest.license_mimetype || '';
      const objectUrl = URL.createObjectURL(response.data);
      releaseObjectUrl(licenseAssetUrl);
      setLicenseAssetUrl(objectUrl);
      setLicenseMimeType(mime);
      setLicenseModalOpen(true);
    } catch (err) {
      setError('Failed to load license document.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const approveRequest = async (requestId) => {
    try {
      await axiosInstance.put(`/admin/company-requests/approve/${requestId}`);
      fetchRequests();
      closeDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to approve request.');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axiosInstance.put(`/admin/company-requests/reject/${requestId}`, {
        admin_review_notes: rejectNotes,
      });
      fetchRequests();
      closeDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reject request.');
    }
  };

  const statusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'approved') return 'bg-green-100 text-green-700';
    if (normalized === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter((request) => (request.status || '').toLowerCase() === statusFilter);
  const isLicenseImage = licenseMimeType.startsWith('image/');

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Company Approvals" />

      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm border ${
                statusFilter === status
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
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
        <div className="text-center py-10">Loading requests...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.request_id} className="border-b">
                  <td className="px-4 py-3">{request.request_id}</td>
                  <td className="px-4 py-3">{request.name}</td>
                  <td className="px-4 py-3">{request.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusBadge(request.status)}`}>
                      {request.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetails(request)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                    No company approvals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showDetails && activeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{activeRequest.name}</h3>
                <p className="text-sm text-gray-500">{activeRequest.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${statusBadge(activeRequest.status)}`}>
                {activeRequest.status || 'pending'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm">{activeRequest.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="text-sm">
                  {activeRequest.created_at || activeRequest.createdAt
                    ? new Date(activeRequest.created_at || activeRequest.createdAt).toLocaleString()
                    : '-'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm whitespace-pre-wrap">{activeRequest.description || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">License Document</p>
                {activeRequest.license_doc_url ? (
                  <button
                    type="button"
                    onClick={openLicenseModal}
                    disabled={licenseLoading}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-60"
                  >
                    {licenseLoading ? 'Loading...' : 'View License'}
                  </button>
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Logo</p>
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Company logo"
                    className="h-12 mt-1 rounded"
                  />
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">Company Profile</p>
                <span className="text-xs text-gray-400">
                  ID #{activeRequest.request_id}
                </span>
              </div>
              {loadingProfile && (
                <div className="text-sm text-gray-500">Loading company profile...</div>
              )}
              {!loadingProfile && companyProfile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p>{companyProfile.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p>{companyProfile.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p>{companyProfile.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p>{activeRequest.status || 'pending'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="whitespace-pre-wrap">{companyProfile.description || '-'}</p>
                  </div>
                </div>
              )}
              {!loadingProfile && !companyProfile && (
                <div className="text-sm text-gray-500">
                  Company profile not available.
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Admin Notes (sent on rejection)</label>
              <textarea
                rows="3"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Add notes for approval or rejection."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDetails}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded"
              >
                Close
              </button>
              {activeRequest.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => rejectRequest(activeRequest.request_id)}
                    className="px-4 py-2 bg-red-600 text-white rounded"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => approveRequest(activeRequest.request_id)}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {licenseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">License Document</h3>
              <button
                type="button"
                onClick={closeLicenseModal}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded"
              >
                Close
              </button>
            </div>

            {isLicenseImage ? (
              <img
                src={licenseAssetUrl}
                alt="License document"
                className="max-h-[70vh] w-auto mx-auto rounded border"
              />
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-700 mb-3">
                  This license file is not an image. Download it to view.
                </p>
                <a
                  href={licenseAssetUrl}
                  download={`license_${activeRequest?.request_id || 'file'}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Download License
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyRequests;
