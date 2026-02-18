import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { seekerApi } from "../services/api";

const AIConsultantPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);

  const sessionsQ = useQuery({ queryKey: ["chat-sessions"], queryFn: seekerApi.listChatSessions });

  const startMutation = useMutation({
    mutationFn: (mockInterview: boolean) =>
      seekerApi.startChat({
        language: "english",
        initialData: { mode: mockInterview ? "mock_interview" : "career_advisor" },
      }),
    onSuccess: (data: any) => {
      const id = data?.session_id || data?.sessionId || data?.id;
      if (id) setSessionId(String(id));
      setMessages([]);
    },
  });

  const chatMutation = useMutation({
    mutationFn: () => seekerApi.sendChat({ sessionId, message }),
    onSuccess: (data: any) => {
      setMessages((prev) => [...prev, { role: "user", text: message }, { role: "assistant", text: data?.reply || data?.message || JSON.stringify(data) }]);
      setMessage("");
    },
  });

  return (
    <div className="glass-card flex h-[78vh] flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-primary" onClick={() => startMutation.mutate(false)}>Start Session</button>
        <button className="btn-ghost" onClick={() => startMutation.mutate(true)}>Mock Interview Mode</button>
        <select className="field max-w-xs" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          <option value="">Select session</option>
          {(sessionsQ.data || []).map((s: any) => {
            const id = String(s.session_id || s.id || "");
            return <option key={id} value={id}>{id}</option>;
          })}
        </select>
      </div>

      <div className="flex-1 space-y-2 overflow-auto rounded-xl border border-[var(--border)] p-3">
        {messages.map((m, idx) => (
          <div key={idx} className={`max-w-[80%] rounded-xl p-3 text-sm ${m.role === "user" ? "ml-auto bg-[var(--accent)] text-black" : "bg-[var(--glass)]"}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input className="field" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask for interview prep, career strategy, CV improvements..." />
        <button className="btn-primary" onClick={() => chatMutation.mutate()} disabled={!sessionId || !message}>Send</button>
      </div>
    </div>
  );
};

export default AIConsultantPage;