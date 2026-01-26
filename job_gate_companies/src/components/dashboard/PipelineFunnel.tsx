import React from "react";
import type { DashboardPipelineStage } from "../../types";

interface PipelineFunnelProps {
  stages: DashboardPipelineStage[];
}

const PipelineFunnel: React.FC<PipelineFunnelProps> = ({ stages }) => {
  const max = Math.max(...stages.map((stage) => stage.count), 1);
  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div key={stage.label} className="flex items-center gap-3">
          <div className="w-20 text-xs text-[var(--text-muted)]">{stage.label}</div>
          <div className="flex-1 rounded-full bg-slate-200/40">
            <div
              className="h-3 rounded-full"
              style={{
                width: `${(stage.count / max) * 100}%`,
                backgroundColor: stage.color,
                boxShadow: `0 0 16px ${stage.color}`,
              }}
            />
          </div>
          <div className="w-10 text-end text-xs text-[var(--text-primary)]">{stage.count}</div>
        </div>
      ))}
    </div>
  );
};

export default PipelineFunnel;
