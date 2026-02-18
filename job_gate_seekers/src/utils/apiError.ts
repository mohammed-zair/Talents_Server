import axios from "axios";

const NETWORK_HINT =
  "Unable to reach the server. Check internet, domain DNS, or CORS settings.";

export const getApiErrorMessage = (error: unknown, fallback = "Request failed") => {
  if (!axios.isAxiosError(error)) return fallback;

  const status = error.response?.status;
  const responseMessage = error.response?.data?.message;

  if (typeof responseMessage === "string" && responseMessage.trim().length > 0) {
    return responseMessage;
  }

  if (status === 403) {
    return "Request blocked by server policy. Please verify CORS/origin configuration.";
  }

  if (error.code === "ERR_NETWORK" || !error.response) {
    return NETWORK_HINT;
  }

  if (status === 500) {
    return "Server error. Please try again in a moment.";
  }

  return fallback;
};
