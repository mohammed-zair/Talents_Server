const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const emailController = require("../controllers/email.controller");
const talentsEmailController = require("../controllers/talentsEmail.controller");
const pushController = require("../controllers/push.controller");
const { verifyToken } = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");

// تطبيق وسيط الأدمن على جميع مسارات الإدارة
router.use(verifyToken, verifyAdmin);

// --- إدارة المستخدمين والوظائف والطلبات ---
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.get("/job-postings", adminController.listAllJobPostings);
router.get("/applications", adminController.listAllApplications);
router.put("/applications/:id", adminController.updateApplicationStatus);

// --- إدارة السير الذاتية (CVs) ---
router.get("/cvs", adminController.listAllCVs);
router.get("/cvs/:userId", adminController.getAndDownloadUserCV);

// --- الإشعارات والبريد الإلكتروني ---
router.post("/email/send", emailController.sendCustomEmail);
router.get("/email", emailController.listSentEmails);
router.post(
  "/talents/invite-emails",
  talentsEmailController.sendTalentsInviteEmails,
);
router.post("/talents/import-cvs", talentsEmailController.processCvImports);
router.post("/push/send", pushController.sendPushToUser);
router.get("/push", pushController.listSentPushNotifications);

// --- إدارة طلبات الشركات (Company Requests) ---
router.get("/company-requests", adminController.listCompanyRequests);
router.put(
  "/company-requests/approve/:id",
  adminController.approveCompanyRequest,
);
router.put(
  "/company-requests/reject/:id",
  adminController.rejectCompanyRequest,
);
router.delete("/companies/:id", adminController.deleteCompany);

module.exports = router;
