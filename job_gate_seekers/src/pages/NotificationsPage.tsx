import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";

const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const notificationsQ = useQuery({
    queryKey: ["notifications"],
    queryFn: seekerApi.listNotifications,
  });

  const notificationItems = useMemo(
    () => (Array.isArray(notificationsQ.data) ? notificationsQ.data : []),
    [notificationsQ.data]
  );

  const readMutation = useMutation({
    mutationFn: (id: number) => seekerApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("notifications")}</h1>
      </div>

      <div className="glass-card p-4">
        <div className="space-y-2">
          {notificationItems.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">{t("noNotificationsYet")}</p>
          )}
          {notificationItems.map((n: any) => (
            <div key={n.push_id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{n.title}</p>
                {!n.is_read && <span className="badge">{t("unread")}</span>}
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{n.message}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : "-"}
                </p>
                <button
                  className="btn-ghost"
                  onClick={() => readMutation.mutate(n.push_id)}
                >
                  {t("markAsRead")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
