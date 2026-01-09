import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCompany, setActiveCompany] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    logo_url: '',
    license_doc_url: '',
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/companies/admin/all');
      const payload = extractData(response);
      setCompanies(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError('Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openEdit = (company) => {
    setActiveCompany(company);
    setFormData({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      description: company.description || '',
      logo_url: company.logo_url || '',
      license_doc_url: company.license_doc_url || '',
    });
    setShowEdit(true);
  };

  const closeEdit = () => {
    setActiveCompany(null);
    setShowEdit(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateCompany = async () => {
    if (!activeCompany) return;
    try {
      await axiosInstance.put(`/companies/admin/${activeCompany.company_id}`, formData);
      closeEdit();
      fetchCompanies();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update company.');
    }
  };

  const deleteCompany = async (companyId) => {
    if (!window.confirm('Delete this company?')) return;
    try {
      await axiosInstance.delete(`/companies/admin/${companyId}`);
      fetchCompanies();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete company.');
    }
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Companies" />

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchCompanies}
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
        <div className="text-center py-10">Loading companies...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Approved</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.company_id} className="border-b">
                  <td className="px-4 py-3">{company.company_id}</td>
                  <td className="px-4 py-3">{company.name}</td>
                  <td className="px-4 py-3">{company.email}</td>
                  <td className="px-4 py-3">{company.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${company.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {company.is_approved ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEdit(company)}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCompany(company.company_id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showEdit && activeCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-4">Edit Company</h3>
            <div className="grid grid-cols-1 gap-4">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Company name"
                className="border rounded px-3 py-2"
              />
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="border rounded px-3 py-2"
              />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone"
                className="border rounded px-3 py-2"
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                rows="3"
                className="border rounded px-3 py-2"
              />
              <input
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                placeholder="Logo URL"
                className="border rounded px-3 py-2"
              />
              <input
                name="license_doc_url"
                value={formData.license_doc_url}
                onChange={handleChange}
                placeholder="License document URL"
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateCompany}
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

export default Companies;
