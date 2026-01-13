const companiesController = require("./companies.controller");

/**
 * @desc [Public] Company registration (legacy route)
 * @route POST /api/company-requests
 * @access Public
 */
exports.createRequest = companiesController.registerCompany;

/**
 * @desc [Public] Track company request status (deprecated)
 * @route POST /api/company-requests/track
 * @access Public
 */
exports.trackRequestStatus = async (req, res) => {
  return res.status(410).json({
    message: "Tracking is deprecated. Please log in to check your status.",
  });
};
