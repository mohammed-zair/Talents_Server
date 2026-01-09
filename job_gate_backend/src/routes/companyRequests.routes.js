// file: src/routes/companyRequests.routes.js
const express = require("express");
const router = express.Router();
const companyRequestController = require("../controllers/companyRequests.controller");
const authJwt = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");

// =====================
// Public Routes
// =====================

// إنشاء طلب جديد
router.post("/", companyRequestController.createRequest);

// 🆕 تتبع حالة الطلب (بدون Login)
router.post("/track", companyRequestController.trackRequestStatus);

// =====================
// Admin Routes
// =====================
const adminAccess = [authJwt.verifyToken, verifyAdmin];

router.get("/", adminAccess, companyRequestController.getAllRequests);
router.get("/:id", adminAccess, companyRequestController.getRequestById);
router.put("/approve/:id", adminAccess, companyRequestController.approveRequest);
router.put("/reject/:id", adminAccess, companyRequestController.rejectRequest);

module.exports = router;
