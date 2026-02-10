const express = require("express");
const router = express.Router();
const controller = require("../controllers/company/companyCVRequest.controller");
const verifyCompanyAccess = require("../middleware/verifyCompanyAccess");
const verifyCompany = require("../middleware/verifyCompany");
const verifyCompanyApproved = require("../middleware/verifyCompanyApproved");

router.post(
  "/",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  controller.createCVRequest
);
router.get(
  "/",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  controller.getMyCVRequests
);

module.exports = router;
