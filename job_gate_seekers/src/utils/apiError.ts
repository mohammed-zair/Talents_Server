import axios from "axios";

const NETWORK_HINT =
  "Unable to reach the server. Check your connection, VPN, or DNS, then try again.";
const TIMEOUT_HINT =
  "The server is taking too long to respond. Please try again shortly.";
const CORS_HINT =
  "Request blocked by server policy. Verify CORS/origin configuration.";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Request rejected by the server. Please review your input.",
  401: "Your session may have expired. Please sign in again.",
  403: CORS_HINT,
  404: "The requested resource was not found.",
  408: TIMEOUT_HINT,
  409: "Request conflict. Please refresh and try again.",
  413: "Upload too large. Please reduce file size and retry.",
  422: "Validation failed. Please check your input.",
  429: "Too many requests. Please wait and try again.",
  500: "Server error. Please try again in a moment.",
  502: "Bad gateway. The server is temporarily unavailable.",
  503: "Service unavailable. Please try again shortly.",
  504: "Gateway timeout. Please try again shortly.",
};

const normalizeCode = (code?: string) => (code || "").toUpperCase();

export const getApiErrorMessage = (error: unknown, fallback = "Request failed") => {
  if (!axios.isAxiosError(error)) return fallback;

  const status = error.response?.status;
  const responseMessage = error.response?.data?.message;
  const code = normalizeCode(error.code);
  const message = (error.message || "").toLowerCase();

  if (typeof responseMessage === "string" && responseMessage.trim().length > 0) {
    return responseMessage;
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (code === "ECONNABORTED" || message.includes("timeout")) {
    return TIMEOUT_HINT;
  }

  if (code === "ERR_NETWORK" || !error.response) {
    return NETWORK_HINT;
  }

  return fallback;
};
