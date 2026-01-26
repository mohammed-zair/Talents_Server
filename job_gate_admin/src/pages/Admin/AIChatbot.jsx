import React, { useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const AIChatbot = () => {
  const [sessionId, setSessionId] = useState('');
  const [language, setLanguage] = useState('english');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
