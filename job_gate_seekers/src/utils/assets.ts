const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const resolveApiRoot = () => {
  const fallbackOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5000";
  return new URL(API_BASE_URL, fallbackOrigin);
};

const API_ROOT = resolveApiRoot();
const API_ORIGIN = API_ROOT.origin;
const API_PREFIX = API_ROOT.pathname.replace(/\/+$/, "");

export const buildAssetUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/uploads/")) {
    return `${API_ORIGIN}${API_PREFIX}${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value}`;
};

