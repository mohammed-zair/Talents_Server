// file: src/models/index.js (المحدث مع إضافة AI Models)
const sequelize = require("../config/db.config");
const User = require("./user.model");
const Company = require("./company.model");
const CompanyRequest = require("./companyRequest.model");
const Admin = require("./admin.model");
const Consultant = require("./consultant.model");
const JobPosting = require("./jobPosting.model");
const JobForm = require("./jobForm.model");
const JobFormField = require("./jobFormField.model");
const Application = require("./application.model");
const CV = require("./cv.model");
const CVStructuredData = require("./cvStructuredData.model");
const CVFeaturesAnalytics = require("./cvFeaturesAnalytics.model"); 
const EmailNotification = require("./EmailNotification.model");
const PushNotification = require("./PushNotification.model");
const CompanyCVRequest = require("./companyCVRequest.model");
const CompanyCVDelivery = require("./companyCVDelivery.model");
const { constants } = require("fs/promises");
const SavedJob = require("./savedJob.model");
const ConsultationRequest = require("./consultationRequest.model");
const ConsultationBooking = require("./consultationBooking.model");

// التقديم ينتمي لموظف (مستخدم)
Application.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Application, { foreignKey: "user_id" });

// التقديم ينتمي لوظيفة
Application.belongsTo(JobPosting, { foreignKey: "job_id" });
JobPosting.hasMany(Application, { foreignKey: "job_id" });

// --- 1. علاقات الشركة (Company) ---
Company.hasMany(JobPosting, { foreignKey: "company_id", onDelete: "CASCADE" });
JobPosting.belongsTo(Company, { foreignKey: "company_id" });

// --- 2. علاقات المستخدم (User - Job Seeker) ---
// المستخدم لديه سير ذاتية متعددة
User.hasMany(CV, { foreignKey: "user_id", onDelete: "CASCADE" });
CV.belongsTo(User, { foreignKey: "user_id" });
Consultant.belongsTo(User, { foreignKey: "user_id" });
// المستخدم يقدم طلبات توظيف
User.hasMany(Application, { foreignKey: "user_id", onDelete: "CASCADE" });
Application.belongsTo(User, { foreignKey: "user_id" });

// --- 3. علاقات الوظيفة (JobPosting) و النموذج (JobForm) ---
// الوظيفة لديها نموذج أسئلة داخلي مرتبط بها
JobPosting.hasOne(JobForm, { foreignKey: "job_id", onDelete: "CASCADE" });
JobForm.belongsTo(JobPosting, { foreignKey: "job_id" });

// الوظيفة تتلقى طلبات توظيف
JobPosting.hasMany(Application, { foreignKey: "job_id", onDelete: "CASCADE" });
Application.belongsTo(JobPosting, { foreignKey: "job_id" });

// --- 4. علاقات النموذج (JobForm) و حقوله (JobFormField) ---
JobForm.hasMany(JobFormField, { foreignKey: "form_id", onDelete: "CASCADE" });
JobFormField.belongsTo(JobForm, { foreignKey: "form_id" });

// --- 5. علاقات الطلب (Application) و السيرة الذاتية (CV) ---
// طلب التوظيف مرتبط بسيرة ذاتية واحدة
Application.belongsTo(CV, { foreignKey: "cv_id", onDelete: "SET NULL" });
CV.hasMany(Application, { foreignKey: "cv_id", onDelete: "SET NULL" });

// --- 6. علاقات السيرة الذاتية (CV) والبيانات المهيكلة والتحليلية ---
// السيرة الذاتية لديها بيانات مهيكلة
CV.hasOne(CVStructuredData, { foreignKey: "cv_id", onDelete: "CASCADE" });
CVStructuredData.belongsTo(CV, { foreignKey: "cv_id" });

// السيرة الذاتية لديها بيانات تحليلية (للفلترة والمطابقة) ⬅️ جديد
CV.hasOne(CVFeaturesAnalytics, { foreignKey: "cv_id", onDelete: "CASCADE" });
CVFeaturesAnalytics.belongsTo(CV, { foreignKey: "cv_id" });

Company.hasMany(CompanyCVRequest, { foreignKey: "company_id",onDelete: "CASCADE",
});
CompanyCVRequest.belongsTo(Company, {foreignKey: "company_id",});

CompanyCVDelivery.belongsTo(CV, { foreignKey: "cv_id" });
CV.hasMany(CompanyCVDelivery, { foreignKey: "cv_id" });

// ---   علاقات أخرى ---
Company.hasMany(User, { foreignKey: "company_id", onDelete: "SET NULL" });
User.belongsTo(Company, { foreignKey: "company_id" });
Admin.belongsTo(User, { foreignKey: "user_id", onDelete: "CASCADE" });
EmailNotification.belongsTo(Company, { foreignKey: "company_id" });
PushNotification.belongsTo(User, { foreignKey: "user_id" });

// --- Saved Jobs (Bookmarks) ---
User.hasMany(SavedJob, { foreignKey: "user_id", onDelete: "CASCADE" });
SavedJob.belongsTo(User, { foreignKey: "user_id" });

JobPosting.hasMany(SavedJob, { foreignKey: "job_id", onDelete: "CASCADE" });
SavedJob.belongsTo(JobPosting, { foreignKey: "job_id" });

// ==============================
// Consultant Requests & Bookings
// ==============================

// Consultant -> Requests
Consultant.hasMany(ConsultationRequest, {
  foreignKey: "consultant_id",
  onDelete: "CASCADE",
});
ConsultationRequest.belongsTo(Consultant, {
  foreignKey: "consultant_id",
});

// User -> Requests (Requester)
User.hasMany(ConsultationRequest, {
  foreignKey: "requester_user_id",
  onDelete: "CASCADE",
});
ConsultationRequest.belongsTo(User, {
  foreignKey: "requester_user_id",
});

// Consultant -> Bookings
Consultant.hasMany(ConsultationBooking, {
  foreignKey: "consultant_id",
  onDelete: "CASCADE",
});
ConsultationBooking.belongsTo(Consultant, {
  foreignKey: "consultant_id",
});

// User -> Bookings
User.hasMany(ConsultationBooking, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
});
ConsultationBooking.belongsTo(User, {
  foreignKey: "user_id",
});

// ---   تصدير جميع النماذج ---
module.exports = {
  sequelize,
  User,
  Company,
  CompanyRequest,
  Admin,
  JobPosting,
  JobForm,
  JobFormField,
  Application,

  Consultant,
  CV,
  CVStructuredData,
  CVFeaturesAnalytics, 
  EmailNotification,
  PushNotification,
  CompanyCVRequest,
  CompanyCVDelivery,
  SavedJob,
  ConsultationRequest,
  ConsultationBooking,

};
 