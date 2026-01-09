const express = require("express");
const router = express.Router();
const controller = require("../controllers/company/companyCVRequest.controller");
const authMiddleware = require("../middleware/authJwt");
const verifyCompany = require("../middleware/verifyCompany");

router.post("/", authMiddleware.verifyToken, verifyCompany, controller.createCVRequest);
router.get("/", authMiddleware.verifyToken, verifyCompany, controller.getMyCVRequests);

module.exports = router;