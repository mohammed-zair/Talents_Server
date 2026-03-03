const express = require("express");
const router = express.Router();

const companiesController = require("../controllers/companies.controller");
const companyAuthController = require("../controllers/companyAuth.controller"); // 🆕 جديد
const jobPostingController = require("../controllers/jobPosting.controller");

const verifyAdmin = require("../middleware/verifyAdmin");
const { verifyToken } = require("../middleware/authJwt");
const verifyCompanyAccess = require("../middleware/verifyCompanyAccess");
const verifyCompany = require("../middleware/verifyCompany");
const verifyCompanyApproved = require("../middleware/verifyCompanyApproved");

const uploadJobImage = require("../middleware/uploadJobImage");
const uploadCompanyLogo = require("../middleware/uploadCompanyLogo");
const uploadCompanyAssets = require("../middleware/uploadCompanyAssets");

// ----------------------------------------------------------------------
//                      المسارات العامة (Public)
// ----------------------------------------------------------------------

// 📌 تسجيل دخول الشركة
router.post("/login", companyAuthController.loginCompany);

router.post("/refresh", companyAuthController.refreshCompanySession);
router.post("/logout", companyAuthController.logoutCompany);
router.get("/session", verifyCompanyAccess, verifyCompany, companyAuthController.getCompanySession);

// 📌 تعيين كلمة المرور (أول مرة)
router.post("/set-password", companyAuthController.setCompanyPassword);
router.post("/forgot-password", companyAuthController.forgotCompanyPassword);
router.post("/reset-password", companyAuthController.resetCompanyPassword);
router.post("/register/send-otp", companiesController.sendCompanyRegistrationOtp);
router.post("/register/verify-otp", companiesController.verifyCompanyRegistrationOtp);

// Company registration (pending approval)
router.post(
  "/register",
  uploadCompanyAssets.fields([
    { name: "logo", maxCount: 1 },
    { name: "license_doc", maxCount: 1 },
  ]),
  companiesController.registerCompany
);

// Track company approval status
router.post("/track", companiesController.trackCompanyApproval);

// 📌 قائمة الشركات المعتمدة
router.get("/", companiesController.listApprovedCompanies);

// 📌 تفاصيل شركة معتمدة
router.get("/:id/logo", companiesController.getCompanyLogo);
router.get("/:id", companiesController.getApprovedCompanyDetails);

// ----------------------------------------------------------------------
//                  المسارات الخاصة بالأدمن (Admin Only)
// ----------------------------------------------------------------------

router.post(
  "/",
  verifyToken,
  verifyAdmin,
  uploadCompanyAssets.fields([
    { name: "logo", maxCount: 1 },
    { name: "license_doc", maxCount: 1 },
  ]),
  companiesController.createCompany
);
router.get(
  "/admin/all",
  verifyToken,
  verifyAdmin,
  companiesController.getAllCompanies
);
router.get(
  "/admin/:id",
  verifyToken,
  verifyAdmin,
  companiesController.getCompanyById
);
router.get(
  "/admin/:id/license",
  verifyToken,
  verifyAdmin,
  companiesController.getCompanyLicenseDoc
);
router.get(
  "/admin/:id/logo",
  verifyToken,
  verifyAdmin,
  companiesController.getCompanyLogoAdmin
);
router.put(
  "/admin/:id",
  verifyToken,
  verifyAdmin,
  companiesController.updateCompany
);
router.delete(
  "/admin/:id",
  verifyToken,
  verifyAdmin,
  companiesController.deleteCompany
);


//   (Company) مسارات لوحة تحكم الشركة 

//    change password
router.put(
  "/company/change-password",
  verifyCompanyAccess,
  verifyCompany,
  companyAuthController.changeCompanyPassword
);
router.post(
  "/company/delete-account/request",
  verifyCompanyAccess,
  verifyCompany,
  companyAuthController.requestDeleteCompanyAccount
);
router.post(
  "/company/delete-account/confirm",
  verifyCompanyAccess,
  verifyCompany,
  companyAuthController.confirmDeleteCompanyAccount
);

//  Dashboard
router.get(
  "/company/dashboard",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.getCompanyDashboard
);

//  Profile
router.get(
  "/company/profile",
  verifyCompanyAccess,
  verifyCompany,
  companiesController.getCompanyProfile
);

router.put(
  "/company/profile",
  verifyCompanyAccess,
  verifyCompany,
  uploadCompanyLogo.single("logo"),
  companiesController.updateCompanyProfile
);

router.post(
  "/company/users",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.addCompanyUser
);

//  Applications
router.get(
  "/company/applications",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.getCompanyApplications
);
router.get(
  "/company/applications/:id",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.getCompanyApplicationsByID
);
router.get(
  "/company/applications/:id/cv",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.downloadApplicationCv
);

router.put(
  "/company/applications/:id",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.updateApplicationStatus
);
router.put(
  "/company/applications/:id/star",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  companiesController.toggleApplicationStar
);

//           Job Postings (Company)
 

//  Create job (with image)
router.post(
  "/company/job-postings",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  uploadJobImage.single("job_image"),
  jobPostingController.createJobPosting
);

//  Get company jobs
router.get(
  "/company/job-postings",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.getCompanyJobPostings
);

//  Update job
router.put(
  "/company/job-postings/:id",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  uploadJobImage.single("job_image"),
  jobPostingController.updateJobPosting
);
router.post(
  "/company/job-postings/:id/recalculate-insights",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.recalculateJobInsights
);

//  Toggle job status
router.put(
  "/company/job-postings/:id/toggle",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.toggleJobPostingStatus
);

//  Delete job
router.delete(
  "/company/job-postings/:id",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.deleteJobPosting
);

//  Internal job form
router.post(
  "/company/job-forms",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.createJobForm
);

//  Update internal job form (replace)
router.put(
  "/company/job-postings/:id/form",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.updateJobForm
);

//  Delete internal job form
router.delete(
  "/company/job-postings/:id/form",
  verifyCompanyAccess,
  verifyCompany,
  verifyCompanyApproved,
  jobPostingController.deleteJobForm
);



module.exports = router;
