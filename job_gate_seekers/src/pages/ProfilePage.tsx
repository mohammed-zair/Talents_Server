import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";

const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const savedJobsQ = useQuery({ queryKey: ["saved-jobs"], queryFn: seekerApi.getSavedJobs });
  const notificationsQ = useQuery({ queryKey: ["notifications"], queryFn: seekerApi.listNotifications });
  const savedItems = useMemo(() => (Array.isArray(savedJobsQ.data) ? savedJobsQ.data : []), [savedJobsQ.data]);
  const notificationItems = useMemo(() => (Array.isArray(notificationsQ.data) ? notificationsQ.data : []), [notificationsQ.data]);
  const { t } = useLanguage();

  const removeSavedMutation = useMutation({
    mutationFn: (jobId: number) => seekerApi.removeSavedJob(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-jobs"] }),
  });

  const readMutation = useMutation({
    mutationFn: (id: number) => seekerApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="glass-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("savedJobs")}</h2>
        <div className="space-y-2">
          {savedItems.map((s: any) => (
            <div key={s.job_id || s.JobPosting?.job_id} className="rounded-xl border border-[var(--border)] p-3">
              <p className="font-medium">{s.JobPosting?.title || t("company")}</p>
              <button className="btn-ghost mt-2" onClick={() => removeSavedMutation.mutate(Number(s.JobPosting?.job_id || s.job_id))}>{t("remove")}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("notifications")}</h2>
        <div className="space-y-2">
          {notificationItems.map((n: any) => (
            <div key={n.push_id} className="rounded-xl border border-[var(--border)] p-3">
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{n.message}</p>
              <button className="btn-ghost mt-2" onClick={() => readMutation.mutate(n.push_id)}>{t("markAsRead")}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
