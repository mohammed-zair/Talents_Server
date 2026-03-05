const express = require("express");
const router = express.Router();
const controller = require("../controllers/admin/companyCVRequest.admin.controller");
const authMiddleware = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");

router.use(authMiddleware.verifyToken, verifyAdmin);

router.get("/", controller.getAllCVRequests);
router.get("/:id", controller.getHeadhuntRequestById);
router.put("/:id/status", controller.updateStatus);
router.get("/:id/candidate-feed", controller.getCandidateFeed);
router.get("/:id/candidates", controller.listRequestCandidates);
router.post("/:id/candidates", controller.addRequestCandidate);
router.patch("/:id/candidates/:candidateId", controller.updateRequestCandidate);
router.post("/:id/company-update", controller.sendCompanyUpdate);

module.exports = router;
