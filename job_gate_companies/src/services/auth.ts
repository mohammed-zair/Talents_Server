export interface JwtPayload {
  role?: string;
  type?: string;
  isCompany?: boolean;
  is_company?: boolean;
  user_type?: string;
  account_type?: string;
  company_id?: string;
  companyId?: string;
  companyID?: string;
  company?: { id?: string; company_id?: string; companyId?: string };
  exp?: number;
}

export const getToken = () => localStorage.getItem("twt-token");

export const setToken = (token: string) => {
  localStorage.setItem("twt-token", token);
};

export const clearToken = () => {
  localStorage.removeItem("twt-token");
};

export const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

export const isCompanyToken = (token: string | null) => {
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload) return false;
  if (payload.exp && Date.now() / 1000 > payload.exp) return false;
  const role = payload.role || payload.type || payload.user_type || payload.account_type;
  return (
    role === "company" ||
    role === "COMPANY" ||
    payload.isCompany === true ||
    payload.is_company === true ||
    Boolean(payload.company_id) ||
    Boolean(payload.companyId) ||
    Boolean(payload.companyID) ||
    Boolean(payload.company?.id) ||
    Boolean(payload.company?.company_id) ||
    Boolean(payload.company?.companyId)
  );
};
