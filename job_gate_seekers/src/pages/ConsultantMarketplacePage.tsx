import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { seekerApi } from "../services/api";

const ConsultantMarketplacePage: React.FC = () => {
  const consultantsQ = useQuery({ queryKey: ["consultants"], queryFn: seekerApi.listConsultants });
  const [selected, setSelected] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  const consultantItems = useMemo(
    () => (Array.isArray(consultantsQ.data) ? consultantsQ.data : []),
    [consultantsQ.data]
  );

  const selectedConsultant = useMemo(
    () => consultantItems.find((c: any) => c.User?.user_id === selected),
    [consultantItems, selected]
  );

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !startTime) throw new Error("Select consultant and start time");
      const start = new Date(startTime);
      const end = new Date(start.getTime() + 15 * 60 * 1000);
      await seekerApi.requestConsultation(selected, message || "15-min career audit request");
      await seekerApi.createBooking({ consultant_user_id: selected, start_time: start.toISOString(), end_time: end.toISOString() });
    },
    onSuccess: () => setFeedback("15-minute audit booked successfully."),
    onError: (e: any) => setFeedback(e?.message || "Booking failed"),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="glass-card p-4">
        <h1 className="mb-3 text-2xl font-bold">Consultant Marketplace</h1>
        <div className="grid gap-3 md:grid-cols-2">
          {consultantItems.map((c: any) => (
            <button
              key={c.consultant_id}
              onClick={() => setSelected(c.User?.user_id || null)}
              className={`rounded-xl border p-3 text-left ${selected === c.User?.user_id ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
            >
              <p className="font-semibold">{c.User?.full_name}</p>
              <p className="text-xs text-[var(--text-muted)]">{(c.expertise_fields || []).join(", ") || "General consulting"}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="text-lg font-semibold">15-Min Audit Booking</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{selectedConsultant?.User?.full_name || "Select consultant"}</p>
        <div className="mt-3 space-y-3">
          <input type="datetime-local" className="field" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <textarea className="field min-h-[100px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your goals for this audit..." />
          <button className="btn-primary w-full" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>Book 15-min Slot</button>
          {feedback && <p className="text-sm text-[var(--text-muted)]">{feedback}</p>}
        </div>
      </div>
    </div>
  );
};

export default ConsultantMarketplacePage;
