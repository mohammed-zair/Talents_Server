const express = require("express");
const router = express.Router();
const controller = require("../controllers/company/companyCVRequest.controller");
const authMiddleware = require("../middleware/authJwt");
const verifyCompany = require("../middleware/verifyCompany");
const verifyCompanyApproved = require("../middleware/verifyCompanyApproved");

router.post(
  "/",
  authMiddleware.verifyToken,
  verifyCompany,
  verifyCompanyApproved,
  controller.createCVRequest
);
router.get(
  "/",
  authMiddleware.verifyToken,
  verifyCompany,
  verifyCompanyApproved,
  controller.getMyCVRequests
);

module.exports = router;
