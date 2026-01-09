// file: src/routes/consultant.routes.js

const express = require("express");
const router = express.Router();
const consultantController = require("../controllers/consultant.controller");
const { verifyToken } = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");


// معالجة طلبات الترقية (قبول/رفض)
router.put(
  "/admin/upgrade/:user_id",
  verifyToken,
  verifyAdmin,
  consultantController.handleConsultantUpgrade
);

// ب. مسارات المستخدم (User Private Access)

// طلب ترقية إلى مستشار
router.post(
  "/user/upgrade",
  verifyToken,
  consultantController.requestConsultantUpgrade
);

// ج. مسارات الوصول العام/الخاصة بالاستشاريين (Public/Private)

//  عرض بروفايل المستشار (للمستخدم العادي والشركة والإداري)
router.get("/:user_id", consultantController.getConsultantProfile);
router.get("/", consultantController.getAllConsultants);

//زر طلب استشارة (للمستخدم العادي والشركة)
router.post(
  "/:user_id/request-consultation",
  verifyToken, 
  consultantController.requestConsultation
);

// د. مسارات الاستشاري (Consultant Dashboard)

// عرض طلبات الاستشارة التي وصلت للمستشار
router.get(
  "/requests",
  verifyToken,
  consultantController.listIncomingConsultationRequests
);

// قبول/رفض طلب استشارة
router.put(
  "/requests/:request_id",
  verifyToken,
  consultantController.respondToConsultationRequest
);

// هـ. مسارات الحجوزات (Booking)

// حجز موعد استشارة (للمستخدم/الباحث)
router.post(
  "/bookings",
  verifyToken,
  consultantController.createConsultationBooking
);

// عرض حجوزات المستشار
router.get(
  "/bookings",
  verifyToken,
  consultantController.listConsultantBookings
);

// إلغاء الحجز (مسموح للمستخدم أو للمستشار)
router.delete(
  "/bookings/:booking_id",
  verifyToken,
  consultantController.cancelConsultationBooking
);

module.exports = router;
