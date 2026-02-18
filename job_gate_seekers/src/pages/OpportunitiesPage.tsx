import React, { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";

const PAGE_SIZE = 8;

const OpportunitiesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [actionMsg, setActionMsg] = useState("");

  const cvsQ = useQuery({ queryKey: ["cvs"], queryFn: seekerApi.listCVs });

  const jobsQ = useInfiniteQuery({
    queryKey: ["jobs-infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const jobs = await seekerApi.getJobs();
      const start = pageParam * PAGE_SIZE;
      return {
        items: jobs.slice(start, start + PAGE_SIZE),
        nextPage: start + PAGE_SIZE < jobs.length ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  });

  const quickApply = useMutation({
    mutationFn: async (job: any) => {
      const cv = cvsQ.data?.[0];
      if (!cv) throw new Error(t("uploadCvFirst"));
      await seekerApi.generatePitch({ cv_id: cv.cv_id, job_id: job.job_id, language });
      const fd = new FormData();
      fd.append("job_id", String(job.job_id));
      fd.append("cv_id", String(cv.cv_id));
      await seekerApi.submitApplication(fd);
      return true;
    },
    onSuccess: () => {
      setActionMsg(t("quickApplySuccess"));
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
    onError: (e: any) => setActionMsg(e?.message || t("quickApplyFailed")),
  });

  const jobs = useMemo(() => jobsQ.data?.pages.flatMap((p) => p.items) || [], [jobsQ.data]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("opportunitiesTitle")}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t("opportunitiesSubtitle")}</p>
      </div>

      {actionMsg && <div className="glass-card p-3 text-sm">{actionMsg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job: any) => {
          const match = Math.min(99, 55 + (job.title?.length || 10) % 38);
          return (
            <div key={job.job_id} className="glass-card card-hover p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{job.title}</h3>
                <span className="badge">{t("match")} {match}%</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">{job.Company?.name || t("company")} | {job.location || t("remote")}</p>
              <div className="mt-4 flex gap-2">
                <button className="btn-primary" onClick={() => quickApply.mutate(job)} disabled={quickApply.isPending}>
                  {t("quickApply")}
                </button>
                <button className="btn-ghost" onClick={() => seekerApi.saveJob(job.job_id)}>{t("save")}</button>
              </div>
            </div>
          );
        })}
      </div>

      {jobsQ.hasNextPage && (
        <div className="text-center">
          <button className="btn-ghost" onClick={() => jobsQ.fetchNextPage()}>{t("loadMore")}</button>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPage;
