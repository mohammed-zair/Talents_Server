exports.successResponse = (res, message, data = null, statusCode = 200) => {
  // Backward-compat: many controllers call successResponse(res, data)
  // In that case `message` is actually the data payload.
  if ((Array.isArray(message) || (message && typeof message === "object")) && data === null) {
    data = message;
    message = [];
  }

  // Support: successResponse(res, data, message)
  if ((Array.isArray(message) || (message && typeof message === "object")) && typeof data === "string") {
    const tmp = message;
    message = data;
    data = tmp;
  }
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

exports.errorResponse = (res, message, error = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error ? error.message || error : null,
  });
};
