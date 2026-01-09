export const extractData = (response) => {
  const payload = response?.data;
  if (!payload) return null;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.message)) return payload.message;

  if (payload.success && payload.message && (payload.data === null || payload.data === undefined)) {
    return payload.message;
  }
  if (payload.data !== undefined && payload.data !== null) return payload.data;
  if (payload.message !== undefined) return payload.message;
  return payload;
};
