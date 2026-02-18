// file: src/routes/user.routes.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const notificationController = require("../controllers/push.controller");
const cvController = require("../controllers/cv.controller");
const companyController = require("../controllers/companies.controller");
const { verifyToken } = require("../middleware/authJwt");  
const { uploadCV } = require("../middleware/upload.middleware"); 
const savedJobsController = require("../controllers/savedJobs.controller");

// --- الوصول العام (Public Access) ---
router.get("/job-postings", userController.listJobPostings);  
router.get("/job-postings/:id", userController.getJobPostingDetails);  
router.get("/companies", companyController.listApprovedCompanies);  
router.get("/companies/:id", companyController.getApprovedCompanyDetails);  
router.post("/company-requests", companyController.submitCompanyRequest);  

// --- الباحث عن عمل (يتطلب مصادقة) ---
// الطلبات والسير الذاتية
router.post(
  "/applications",
  verifyToken,
  uploadCV,
  userController.submitApplication
);  
router.get("/applications/user", verifyToken, userController.listUserApplications);  
router.get("/profile/cv", verifyToken, cvController.listUserCVs);  
router.put("/profile/cv", verifyToken, uploadCV, cvController.uploadNewCV);
router.delete("/profile/cv/:id", verifyToken, cvController.deleteUserCV);

// --- Saved Jobs (Job Seeker) ---
router.post(
  "/saved-jobs/:job_id",
  verifyToken,
  savedJobsController.saveJob
);

router.get(
  "/saved-jobs",
  verifyToken,
  savedJobsController.getSavedJobs
);

router.delete(
  "/saved-jobs/:job_id",
  verifyToken,
  savedJobsController.removeSavedJob
);

// الإشعارات
router.get(
  "/notifications",
  verifyToken,
  notificationController.listUserNotifications
);  
router.get(
  "/notifications/:id",
  verifyToken,
  notificationController.getNotificationDetails
);  
router.get(
  "/notifications/unread",
  verifyToken,
  notificationController.listUnreadNotifications
);  
router.put(
  "/notifications/:id/read",
  verifyToken,
  notificationController.markNotificationAsRead
);  

router.get(
  "/job-postings/:id/form",
  userController.getJobApplicationForm
);

module.exports = router;
