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
  atsScore: number;
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

const PulseInsightsCharts: React.FC<Props> = ({ atsScore, funnel, radarData }) => {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="glass-card p-4">
        <h2 className="mb-2 font-semibold">ATS Health</h2>
        <div className="h-56">
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
        </div>
        <p className="text-center text-sm text-[var(--text-muted)]">
          Current CV strength: {atsScore}/100
        </p>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-2 font-semibold">Application Funnel</h2>
        <div className="space-y-3">
          <div className="funnel-bar">
            <span>Applied</span>
            <b>{funnel.applied}</b>
          </div>
          <div className="funnel-bar">
            <span>Interview</span>
            <b>{funnel.interview}</b>
          </div>
          <div className="funnel-bar">
            <span>Offer</span>
            <b>{funnel.offer}</b>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-2 font-semibold">Skill Radar</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="skill" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Seeker"
                dataKey="seeker"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.35}
              />
              <Radar
                name="Market"
                dataKey="market"
                stroke="var(--accent-2)"
                fill="var(--accent-2)"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PulseInsightsCharts;
