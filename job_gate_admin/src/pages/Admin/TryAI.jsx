import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const TryAI = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [saveToDb, setSaveToDb] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError('Please select a CV file (PDF or DOCX).');
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append('file', file);
      if (title) {
        form.append('title', title);
      }
      form.append('useAI', String(useAI));
      form.append('saveToDb', String(saveToDb));

      const response = await axiosInstance.post('/ai/cv/analyze-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = extractData(response);
      setResult(payload);
    } catch (err) {
      setError(err?.response?.data?.message || 'AI analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderFeatures = (features) => {
    if (!features) return null;
    const list = [
      { label: 'ATS Score', value: result?.ats_score },
      { label: 'Total Years Experience', value: features.total_years_experience },
      { label: 'Achievement Count', value: features.achievement_count },
      { label: 'Has Contact Info', value: String(!!features.has_contact_info) },
      { label: 'Has Education', value: String(!!features.has_education) },
      { label: 'Has Experience', value: String(!!features.has_experience) },
      { label: 'ATS Compliant', value: String(!!features.is_ats_compliant) },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((item) => (
          <div key={item.label} className="bg-gray-50 border rounded-lg p-3">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900">{item.value ?? '-'}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="Try AI" />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3 bg-gray-50 border rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Upload CV</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full border rounded px-3 py-2 bg-white"
            />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
              className="w-full border rounded px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(event) => setUseAI(event.target.checked)}
              />
              Use AI parsing
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={saveToDb}
                onChange={(event) => setSaveToDb(event.target.checked)}
              />
              Save analysis to database
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze CV'}
            </button>
          </form>

          <div className="mt-6">
            <Link
              to="/ai-chatbot"
              className="w-full inline-flex items-center justify-center border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition"
            >
              Open AI Chatbot
            </Link>
          </div>
        </div>

        <div className="w-full lg:w-2/3 bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Analysis Result</h3>
              <p className="text-sm text-gray-500">AI analysis summary and details</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center text-gray-500 py-10">
              Upload a CV to see analysis results.
            </div>
          )}

          {loading && (
            <div className="text-center text-gray-500 py-10">Analyzing CV...</div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-xs text-gray-500">ATS Score</p>
                  <p className="text-xl font-semibold text-gray-900">{result.ats_score ?? '-'}</p>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Analysis Method</p>
                  <p className="text-sm font-semibold text-gray-900">{result.analysis_method || '-'}</p>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Processing Time</p>
                  <p className="text-sm font-semibold text-gray-900">{result.processing_time ?? '-'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                {renderFeatures(result.features)}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Structured Data</h4>
                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-auto max-h-80">
{JSON.stringify(result.structured_data || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryAI;
