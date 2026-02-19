import React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Props = {
  t: (key: string) => string;
  atsScore: number | null;
  funnel: {
    applied: number;
    interview: number;
    offer: number;
  };
  radarData: Array<{
    skill: string;
    seeker: number;
    market: number;
  }>;
};

const PulseInsightsCharts: React.FC<Props> = ({ t, atsScore, funnel, radarData }) => {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="glass-card p-4">
        <h2 className="mb-2 font-semibold">{t("atsHealth")}</h2>
        <div className="h-56">
          {typeof atsScore === "number" ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="65%"
                outerRadius="90%"
                data={[{ name: "ATS", value: atsScore }]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={14} fill="var(--accent)" />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
              {t("noData")}
            </div>
          )}
        </div>
        <p className="text-center text-sm text-[var(--text-muted)]">
          {t("currentCvStrength")}: {typeof atsScore === "number" ? `${atsScore}/100` : "-"}
        </p>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-2 font-semibold">{t("applicationFunnel")}</h2>
        <div className="space-y-3">
          <div className="funnel-bar">
            <span>{t("applied")}</span>
            <b>{funnel.applied}</b>
          </div>
          <div className="funnel-bar">
            <span>{t("interview")}</span>
            <b>{funnel.interview}</b>
          </div>
          <div className="funnel-bar">
            <span>{t("offer")}</span>
            <b>{funnel.offer}</b>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-2 font-semibold">{t("skillRadar")}</h2>
        <div className="h-56">
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name={t("seeker")}
                  dataKey="seeker"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.35}
                />
                <Radar
                  name={t("marketLabel")}
                  dataKey="market"
                  stroke="var(--accent-2)"
                  fill="var(--accent-2)"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
              {t("noData")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PulseInsightsCharts;
