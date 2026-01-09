const express = require("express");
const router = express.Router();
const controller = require("../controllers/admin/companyCVRequest.admin.controller");
const authMiddleware = require("../middleware/authJwt");

router.get("/", authMiddleware.verifyToken, controller.getAllCVRequests);
router.put("/:id/status", authMiddleware.verifyToken, controller.updateStatus);

module.exports = router;