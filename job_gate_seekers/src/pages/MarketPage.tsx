import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Building2 } from "lucide-react";
import { seekerApi } from "../services/api";
import { useLanguage } from "../contexts/LanguageContext";
import { getApiErrorMessage } from "../utils/apiError";
import { buildAssetUrl } from "../utils/assets";

const truncate = (text: string, max = 140) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

const MarketPage: React.FC = () => {
  const companiesQ = useQuery({ queryKey: ["companies"], queryFn: seekerApi.listCompanies });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const companyItems = useMemo(() => (Array.isArray(companiesQ.data) ? companiesQ.data : []), [companiesQ.data]);
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const saved = (location.state as any)?.marketSearch;
    if (typeof saved === "string") {
      setSearch(saved);
      setDebouncedSearch(saved);
    }
  }, [location.state]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(handle);
  }, [search]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return companyItems;
    return companyItems.filter((c: any) =>
      `${c.name || ""} ${c.description || ""}`.toLowerCase().includes(q)
    );
  }, [companyItems, debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h1 className="text-2xl font-bold">{t("marketTitle")}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t("marketSubtitle")}</p>
        <div className="mt-4">
          <label className="sr-only" htmlFor="market-search">
            {t("marketSearchPlaceholder")}
          </label>
          <input
            id="market-search"
            className="field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("marketSearchPlaceholder")}
            aria-label={t("marketSearchPlaceholder")}
          />
        </div>
      </div>

      {companiesQ.isError && (
        <div className="glass-card p-4">
          <p className="text-sm text-red-300">{getApiErrorMessage(companiesQ.error, t("companyLoadFailed"))}</p>
          <button className="btn-ghost mt-3" onClick={() => companiesQ.refetch()}>
            {t("retry")}
          </button>
        </div>
      )}

      {companiesQ.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="glass-card p-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-[var(--border)]" />
            </div>
          ))}
        </div>
      )}

      {!companiesQ.isLoading && !companiesQ.isError && filtered.length === 0 && (
        <div className="glass-card p-4 text-sm text-[var(--text-muted)]">
          {t("noCompaniesFound")}
          {search.trim() && (
            <button className="btn-ghost mt-3" onClick={() => setSearch("")}
            >
              {t("clearSearch")}
            </button>
          )}
        </div>
      )}

      {!companiesQ.isLoading && !companiesQ.isError && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any) => {
            const name = c.name || t("company");
            const logoUrl = buildAssetUrl(c.logo_url);
            return (
              <Link
                key={c.company_id}
                to={`/market/${c.company_id}`}
                state={{ marketSearch: search }}
                className="glass-card card-hover block rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                aria-label={`${t("viewCompany")}: ${name}`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-sky-500/20 px-2 py-1 text-[10px] font-semibold text-sky-200">
                    {t("ratingPending")}
                  </span>
                </div>
                <div className="mt-3 flex justify-center">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={name}
                      className="h-24 w-24 rounded-full border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--text-muted)]">
                      <div className="flex flex-col items-center gap-1">
                        <Building2 size={20} />
                        <span className="text-xs font-semibold">{initials(name)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex h-full flex-col text-center">
                  <p className="text-lg font-semibold">{name}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                    {truncate(c.description || t("noDescriptionYet"))}
                  </p>
                  <div className="mt-4 text-xs font-semibold text-[var(--accent)]">{t("viewCompany")}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MarketPage;


