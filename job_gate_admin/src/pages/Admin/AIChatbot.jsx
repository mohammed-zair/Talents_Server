import React, { useEffect, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';
import { useSearchParams } from 'react-router-dom';

const AIChatbot = () => {
  const [sessionId, setSessionId] = useState('');
  const [language, setLanguage] = useState('english');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(null);
  const [finalSummary, setFinalSummary] = useState(null);
  const [searchParams] = useSearchParams();

  const loadSession = async (sessionIdValue) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/ai/chatbot/session/${sessionIdValue}`);
      const payload = extractData(response);
      const session = payload?.session || payload;
      const restoredConversation = (session?.conversation || []).map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));
      setSessionId(session?.session_id || sessionIdValue);
      setConversation(restoredConversation);
      setIsComplete(Boolean(session?.is_complete));
      setScore(session?.score || session?.score_data || null);
      setFinalSummary(session?.final_summary || null);
      if (session?.language) {
        setLanguage(session.language);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load chatbot session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionIdValue = searchParams.get('sessionId');
    if (sessionIdValue) {
      loadSession(sessionIdValue);
    }
  }, [searchParams]);

  const startSession = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await axiosInstance.post('/ai/chatbot/start', {
        language,
        initialData: {},
      });
      const payload = extractData(response);
      setSessionId(payload.session_id || '');
      setConversation([
        { role: 'assistant', content: payload.message || 'Session started.' },
      ]);
      setIsComplete(false);
      setScore(null);
      setFinalSummary(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start chatbot session.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!sessionId || !message.trim()) {
      setError('Start a session and enter a message.');
      return;
    }

    const nextConversation = [
      ...conversation,
      { role: 'user', content: message.trim() },
    ];
    setConversation(nextConversation);
    setMessage('');
    setError(null);
    setLoading(true);

    try {
      const response = await axiosInstance.post('/ai/chatbot/chat', {
        sessionId,
        message: nextConversation[nextConversation.length - 1].content,
      });
      const payload = extractData(response);
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: payload.message || 'No reply.' },
      ]);
      setIsComplete(Boolean(payload.is_complete));
      setScore(payload.score || null);
      setFinalSummary(payload.final_summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setSessionId('');
    setConversation([]);
    setMessage('');
    setError(null);
    setIsComplete(false);
    setScore(null);
    setFinalSummary(null);
  };

  const exportDocument = async (format) => {
    if (!sessionId) {
      setError('Start a session first.');
      return;
    }
    try {
      setLoading(true);
      const response = await axiosInstance.post(
        '/ai/chatbot/export',
        { session_id: sessionId, format, language },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cv-${sessionId}.${format === 'docx' ? 'docx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to export CV document.');
    } finally {
      setLoading(false);
    }
  };

  const renderAssistantText = (text) => {
    const lines = String(text || '').split(/\r?\n/);
    const nodes = [];
    let hasLead = false;

    const renderInline = (line, keyBase) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return (
            <strong key={`${keyBase}-b-${idx}`} className="text-indigo-700 font-semibold">
              {part}
            </strong>
          );
        }
        return <span key={`${keyBase}-t-${idx}`}>{part}</span>;
      });
    };

    let listBuffer = [];

    const flushList = (keyBase) => {
      if (listBuffer.length === 0) return;
      nodes.push(
        <ul key={`${keyBase}-list`} className="list-disc pl-5 space-y-1 text-slate-700 text-base">
          {listBuffer.map((item, idx) => (
            <li key={`${keyBase}-li-${idx}`}>{renderInline(item, `${keyBase}-li-${idx}`)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.trim();
      const keyBase = `line-${lineIndex}`;
      const isBullet = /^[-*]\s+/.test(line);

      if (isBullet) {
        listBuffer.push(line.replace(/^[-*]\s+/, ''));
        return;
      }

      flushList(keyBase);

      if (!line) {
        nodes.push(<div key={`${keyBase}-spacer`} className="h-2" />);
        return;
      }

      const isNote = /^\(.*\)$/.test(line);
      const isLead = !hasLead && !isNote;
      if (!hasLead && !isNote) {
        hasLead = true;
      }
      nodes.push(
        <p
          key={`${keyBase}-p`}
          className={
            isNote
              ? 'text-xs text-slate-500 italic'
              : isLead
                ? 'text-lg font-semibold text-slate-800'
                : 'text-base text-slate-700'
          }
        >
          {renderInline(line, keyBase)}
        </p>
      );
    });

    flushList('final');
    return nodes;
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Admin" title="AI Chatbot" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gray-50 border rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Session Controls</h3>
          <label className="block text-sm text-gray-600 mb-2">Language</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="w-full border rounded px-3 py-2 mb-4"
          >
            <option value="english">English</option>
            <option value="arabic">Arabic</option>
          </select>
          <button
            type="button"
            onClick={startSession}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Session'}
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="w-full mt-3 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            Reset Session
          </button>

          <div className="mt-6 text-sm text-gray-600">
            <p><strong>Session ID:</strong></p>
            <p className="break-words text-gray-800">{sessionId || 'Not started'}</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border rounded-2xl p-6 flex flex-col">
          <div className="flex-1 overflow-auto border rounded-lg p-4 bg-gradient-to-b from-slate-50 via-white to-slate-50">
            {conversation.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                Start a session to chat with the AI assistant.
              </div>
            )}
            {conversation.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`mb-3 flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                    entry.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white text-sm shadow-sm'
                      : 'bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 text-slate-700 text-base shadow-sm'
                  }`}
                >
                  {entry.role === 'assistant'
                    ? renderAssistantText(entry.content)
                    : entry.content}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={sendMessage} className="mt-4 flex gap-3">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your message..."
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => exportDocument('pdf')}
              disabled={loading || !sessionId}
              className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => exportDocument('docx')}
              disabled={loading || !sessionId}
              className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50"
            >
              Export DOCX
            </button>
            <button
              type="button"
              onClick={() => {
                if (!sessionId) {
                  setError('Start a session first.');
                  return;
                }
                window.open(`/api/ai/chatbot/preview/${sessionId}?language=${language}`, '_blank');
              }}
              disabled={loading || !sessionId}
              className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50 md:col-span-2"
            >
              Preview CV
            </button>
          </div>

          {(finalSummary || score) && (
            <div className="mt-6 bg-slate-50 border rounded-lg p-4">
              {score && (
                <div className="mb-4">
                  <p className="text-sm text-slate-500">CV Score</p>
                  <p className="text-2xl font-semibold text-slate-800">{score.score ?? '-'}</p>
                  {Array.isArray(score.checklist) && score.checklist.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 space-y-1">
                      {score.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {finalSummary && (
                <div className="space-y-2 text-sm text-slate-700">
                  {finalSummary.summary && <p>{finalSummary.summary}</p>}
                  {Array.isArray(finalSummary.improvements) && finalSummary.improvements.length > 0 && (
                    <ul className="list-disc pl-5">
                      {finalSummary.improvements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {finalSummary.job_requirements && (
                    <p className="text-xs text-slate-500">{finalSummary.job_requirements}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
