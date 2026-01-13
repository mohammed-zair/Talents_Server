// file: src/routes/companyRequests.routes.js
const express = require("express");
const router = express.Router();
const companyRequestController = require("../controllers/companyRequests.controller");
const adminController = require("../controllers/admin.controller");
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

router.get("/", adminAccess, adminController.listCompanyRequests);
router.get("/:id", adminAccess, adminController.getCompanyRequestById);
router.put("/approve/:id", adminAccess, adminController.approveCompanyRequest);
router.put("/reject/:id", adminAccess, adminController.rejectCompanyRequest);

module.exports = router;
