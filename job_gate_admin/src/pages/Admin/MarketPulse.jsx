import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';
import { extractData } from '../../utils/api';

const palette = {
  bg: '#070A0F',
  panel: 'rgba(18, 24, 33, 0.78)',
  border: 'rgba(0, 168, 232, 0.25)',
  accent: '#00A8E8',
  accentSoft: '#20E3B2',
  danger: '#ff5f7a',
};

const MarketPulse = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const isArabic =
    (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('lang') === 'ar');

  const t = useMemo(
    () => ({
      title: isArabic ? '???? ??? ?????' : 'Market Pulse',
      category: isArabic ? '?????????' : 'Analytics',
      topSkills: isArabic ? '???? 10 ?????? ??????' : 'Top 10 In-Demand Skills',
      atsTrend: isArabic ? '????? ????? ???? ATS (6 ????)' : 'Average ATS Quality Trend (6 Months)',
      velocity: isArabic ? '???? ??????? (????)' : 'Total Job Velocity (Days)',
      matchRate: isArabic ? '???? ???? ????????' : 'Match Success Rate',
      avgAts: isArabic ? '????? ATS' : 'Average ATS',
      refresh: isArabic ? '?????' : 'Refresh',
      loading: isArabic ? '???? ????? ?????? ?????...' : 'Loading market intelligence...',
      noData: isArabic ? '?? ???? ?????? ?????' : 'Not enough data',
    }),
    [isArabic]
  );

  const fetchMarketHealth = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/admin/market-health', {
        params: force ? { refresh: 1 } : undefined,
      });
      const data = extractData(response) || response?.data?.data || response?.data;
      setPayload(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load market health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketHealth();
  }, []);

  const topSkills = useMemo(
    () => (Array.isArray(payload?.top_skills) ? payload.top_skills : []),
    [payload]
  );
  const trend = useMemo(
    () => (Array.isArray(payload?.ats_quality_trend) ? payload.ats_quality_trend : []),
    [payload]
  );
  const kpis = payload?.kpis || {};
  const maxDemand = Math.max(1, ...topSkills.map((item) => Number(item.demand || 0)));

  const linePath = useMemo(() => {
    if (!trend.length) return '';
    const width = 640;
    const height = 220;
    const maxScore = Math.max(100, ...trend.map((item) => Number(item.average_ats_score || 0)));
    return trend
      .map((item, idx) => {
        const x = (idx / Math.max(1, trend.length - 1)) * (width - 20) + 10;
        const y = height - (Number(item.average_ats_score || 0) / maxScore) * (height - 24) - 12;
        return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
  }, [trend]);

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 rounded-3xl" style={{ background: palette.bg }}>
      <Header category={t.category} title={t.title} />

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => fetchMarketHealth(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: 'rgba(0,168,232,0.15)', color: '#d6f4ff', border: `1px solid ${palette.border}` }}
        >
          {t.refresh}
        </button>
      </div>

      {loading && <p className="text-sm" style={{ color: '#b7c7d9' }}>{t.loading}</p>}
      {error && <p className="text-sm" style={{ color: '#ff94a7' }}>{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#8bc7db' }}>{t.velocity}</p>
              <p className="mt-2 text-3xl font-semibold" style={{ color: '#e8f8ff' }}>{kpis.total_job_velocity_days ?? 0}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#8bc7db' }}>{t.matchRate}</p>
              <p className="mt-2 text-3xl font-semibold" style={{ color: '#e8f8ff' }}>{kpis.match_success_rate ?? 0}%</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#8bc7db' }}>{t.avgAts}</p>
              <p className="mt-2 text-3xl font-semibold" style={{ color: '#e8f8ff' }}>{kpis.avg_ats_score_overall ?? 0}</p>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
            <p className="mb-4 text-sm font-semibold" style={{ color: '#d6f4ff' }}>{t.topSkills}</p>
            {!topSkills.length ? (
              <p style={{ color: '#8ea0b5' }}>{t.noData}</p>
            ) : (
              <div className="space-y-3">
                {topSkills.map((item) => {
                  const width = `${(Number(item.demand || 0) / maxDemand) * 100}%`;
                  return (
                    <div key={item.skill}>
                      <div className="mb-1 flex items-center justify-between text-xs" style={{ color: '#d2e7f3' }}>
                        <span>{item.skill}</span>
                        <span>{item.demand}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-2 rounded-full"
                          style={{ width, background: 'linear-gradient(90deg, #00A8E8 0%, #20E3B2 100%)', boxShadow: '0 0 12px rgba(0,168,232,0.45)' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ background: palette.panel, border: `1px solid ${palette.border}` }}>
            <p className="mb-4 text-sm font-semibold" style={{ color: '#d6f4ff' }}>{t.atsTrend}</p>
            {!trend.length ? (
              <p style={{ color: '#8ea0b5' }}>{t.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <svg width="660" height="250" viewBox="0 0 660 250">
                  <defs>
                    <linearGradient id="atsNeon" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={palette.accent} />
                      <stop offset="100%" stopColor={palette.accentSoft} />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="660" height="250" fill="transparent" />
                  <path d={linePath} stroke="url(#atsNeon)" strokeWidth="4" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(0,168,232,0.5))' }} />
                  {trend.map((item, idx) => {
                    const x = (idx / Math.max(1, trend.length - 1)) * 620 + 20;
                    const y = 220 - (Number(item.average_ats_score || 0) / 100) * 180;
                    return (
                      <g key={`${item.month}-${idx}`}>
                        <circle cx={x} cy={y} r="4" fill={palette.accent} />
                        <text x={x} y="244" textAnchor="middle" fontSize="11" fill="#89a6b7">{item.month}</text>
                        <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#d6f4ff">{item.average_ats_score}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPulse;
