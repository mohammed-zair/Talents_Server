export interface JwtPayload {
  role?: string;
  type?: string;
  isCompany?: boolean;
  company_id?: string;
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
  return (
    payload.role === "company" ||
    payload.type === "company" ||
    payload.isCompany === true ||
    Boolean(payload.company_id)
  );
};
