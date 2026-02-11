// file: src/controllers/admin.controller.js (الملف المُدمج والنهائي)

const {
  User,
  Admin,
  sequelize,
  JobPosting,
  Application,
  Company,
  CV,
  CVAIInsights,
  CVFeaturesAnalytics,
} = require("../models");
const bcrypt = require("bcryptjs");
const { successResponse } = require("../utils/responseHandler");
const sendEmail = require("../utils/sendEmail");
const fs = require("fs");
const util = require("util");
const buildCompanyLogoUrl = (companyId) => `/api/companies/${companyId}/logo`;
const buildCompanyLicenseUrl = (companyId) =>
  `/api/companies/admin/${companyId}/license`;
const unlinkFile = util.promisify(fs.unlink); // دالة لمسح الملفات (افتراضياً)
// ⚙️ دوال إدارة المستخدمين (Admin User Management)


/**
 * @desc [Admin Only] جلب جميع المستخدمين
 * @route GET /api/admin/users
 * @access Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["hashed_password"] },
    });
    return successResponse(res, users); // استخدام successResponse
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب المستخدمين", error: error.message });
  }
};

/**
 * @desc [Admin Only] جلب تفاصيل مستخدم معين
 * @route GET /api/admin/users/:id
 * @access Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["hashed_password"] },
    });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    return successResponse(res, user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب المستخدم", error: error.message });
  }
};

/**
 * @desc [Admin Only] إنشاء مستخدم جديد (بما في ذلك Admin)
 * @route POST /api/admin/users
 * @access Admin
 */
exports.createUser = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { full_name, email, password, phone, user_type } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مستخدم مسبقًا" });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const newUser = await User.create(
      {
        full_name,
        email,
        hashed_password,
        phone,
        user_type: user_type || "seeker",
      },
      { transaction: t }
    );

    if (newUser.user_type === "admin") {
      await Admin.create(
        {
          full_name: newUser.full_name,
          email: newUser.email,
          hashed_password: newUser.hashed_password,
          user_id: newUser.user_id,
        },
        { transaction: t }
      );
    }

    await t.commit();

    const successMessage =
      newUser.user_type === "admin"
        ? "تم إنشاء المستخدم كمسؤول (Admin) بنجاح"
        : "تم إنشاء المستخدم بنجاح";

    const responseUser = newUser.toJSON();
    delete responseUser.hashed_password;

    return successResponse(res, { newUser: responseUser }, successMessage, 201); // استخدام successResponse
  } catch (error) {
    await t.rollback();
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "البريد الإلكتروني أو الاسم الكامل مُسجل بالفعل.",
      });
    }
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء إنشاء المستخدم", error: error.message });
  }
};

/**
 * @desc [Admin Only] تعديل بيانات مستخدم (بما في ذلك تغيير الدور)
 * @route PUT /api/admin/users/:id
 * @access Admin
 */
exports.updateUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    const { full_name, email, phone, user_type, is_active } = req.body;
    const oldUserType = user.user_type;

    await user.update(
      { full_name, email, phone, user_type, is_active },
      { transaction: t }
    );

    // منطق تحديث جدول Admin عند تغيير الدور
    if (user_type && user_type !== oldUserType) {
      if (user_type === "admin") {
        await Admin.create(
          {
            full_name: user.full_name,
            email: user.email,
            hashed_password: user.hashed_password,
            user_id: user.user_id,
          },
          { transaction: t }
        );
      } else if (oldUserType === "admin") {
        await Admin.destroy(
          { where: { user_id: user.user_id } },
          { transaction: t }
        );
      }
    }

    // تحديث بيانات Admin إذا كان المستخدم Admin وتغيرت بياناته الأساسية
    if (user.user_type === "admin" && (full_name || email)) {
      await Admin.update(
        { full_name: user.full_name, email: user.email },
        { where: { user_id: user.user_id }, transaction: t }
      );
    }

    await t.commit();

    const responseUser = user.toJSON();
    delete responseUser.hashed_password;

    return successResponse(
      res,
      { user: responseUser },
      "تم تحديث بيانات المستخدم بنجاح"
    );
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء تحديث المستخدم", error: error.message });
  }
};

/**
 * @desc [Admin Only] حذف مستخدم
 * @route DELETE /api/admin/users/:id
 * @access Admin
 */
exports.deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    if (user.user_type === "admin") {
      await Admin.destroy(
        { where: { user_id: user.user_id } },
        { transaction: t }
      );
    }

    await user.destroy({ transaction: t });
    await t.commit();

    return successResponse(res, null, "تم حذف المستخدم بنجاح");
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء حذف المستخدم", error: error.message });
  }
};

// 📋 دوال إدارة الوظائف والطلبات (Job & Application Management)

/**
 * @desc [Admin Only] عرض جميع إعلانات الوظائف (بما في ذلك المسودة والمغلقة)
 * @route GET /api/admin/job-postings
 * @access Admin
 */
exports.listAllJobPostings = async (req, res) => {
  try {
    const jobPostings = await JobPosting.findAll({
      include: [
        { model: Company, attributes: ["company_id", "name", "email"] },
      ],
      attributes: ["job_id", "title", "status", "form_type", "industry", "created_at"],
      order: [["created_at", "DESC"]],
    });

    return successResponse(res, jobPostings);
  } catch (error) {
    console.error("Admin error listing all job postings:", error);
    return res.status(500).json({
      message: "فشل في جلب جميع إعلانات الوظائف.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] Get job posting details with applicants + analytics
 * @route GET /api/admin/job-postings/:id
 * @access Admin
 */
exports.getJobPostingDetails = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await JobPosting.findByPk(jobId, {
      include: [
        { model: Company, attributes: ["company_id", "name", "email"] },
        {
          model: Application,
          attributes: ["application_id", "status", "submitted_at", "review_notes", "is_starred"],
          include: [
            { model: User, attributes: ["user_id", "full_name", "email"] },
            { model: CV, attributes: ["cv_id", "file_url", "title", "file_type"] },
          ],
        },
      ],
    });

    if (!job) {
      return res.status(404).json({ message: "Job posting not found." });
    }

    const jobData = job.toJSON ? job.toJSON() : job;
    const applications = Array.isArray(jobData.Applications) ? jobData.Applications : [];

    let aiScoreSum = 0;
    let aiScoreCount = 0;
    let atsScoreSum = 0;
    let atsScoreCount = 0;
    let topApplicant = null;
    let topScore = -1;
    let firstApplicationAt = null;
    let firstHighQualityAt = null;

    const statusCounts = {
      pending: 0,
      reviewed: 0,
      shortlisted: 0,
      accepted: 0,
      hired: 0,
      rejected: 0,
    };

    for (const application of applications) {
      const submittedAt = application.submitted_at || null;
      if (submittedAt) {
        const submittedDate = new Date(submittedAt);
        if (!firstApplicationAt || submittedDate < new Date(firstApplicationAt)) {
          firstApplicationAt = submittedDate.toISOString();
        }
      }

      const status = application.status || "pending";
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      }

      const cvId = application.CV?.cv_id;
      let aiScore = null;
      let atsScore = null;

      if (cvId) {
        const insights = await CVAIInsights.findOne({
          where: { cv_id: cvId, job_id: jobData.job_id },
        });
        aiScore =
          insights?.industry_ranking_score ??
          insights?.ats_score ??
          null;
      }

      if (application.CV?.cv_id) {
        const cvFeature = await CVFeaturesAnalytics.findOne({
          where: { cv_id: application.CV.cv_id },
        });
        atsScore = cvFeature?.ats_score ?? null;
      }

      if (typeof aiScore === "number") {
        aiScoreSum += aiScore;
        aiScoreCount += 1;
      }
      if (typeof atsScore === "number") {
        atsScoreSum += atsScore;
        atsScoreCount += 1;
      }

      if (submittedAt && typeof aiScore === "number" && aiScore >= 85) {
        const submittedDate = new Date(submittedAt);
        if (!firstHighQualityAt || submittedDate < new Date(firstHighQualityAt)) {
          firstHighQualityAt = submittedDate.toISOString();
        }
      }

      if (typeof aiScore === "number" && aiScore > topScore) {
        topScore = aiScore;
        topApplicant = {
          application_id: application.application_id,
          candidate: {
            id: application.User?.user_id ?? null,
            name: application.User?.full_name ?? "Candidate",
            email: application.User?.email ?? null,
          },
          score: aiScore,
        };
      }
    }

    return successResponse(res, {
      job: jobData,
      analytics: {
        total_applications: applications.length,
        status_counts: statusCounts,
        avg_ai_score: aiScoreCount ? Number((aiScoreSum / aiScoreCount).toFixed(2)) : null,
        avg_ats_score: atsScoreCount ? Number((atsScoreSum / atsScoreCount).toFixed(2)) : null,
        first_application_at: firstApplicationAt,
        first_high_quality_at: firstHighQualityAt,
        top_applicant: topApplicant,
      },
    });
  } catch (error) {
    console.error("Admin error fetching job posting details:", error);
    return res.status(500).json({
      message: "Failed to fetch job posting details.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] عرض جميع طلبات التوظيف من كل المستخدمين والوظائف
 * @route GET /api/admin/applications
 * @access Admin
 */
exports.listAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      attributes: ["application_id", "status", "submitted_at", "review_notes"],
      include: [
        {
          model: JobPosting,
          attributes: ["job_id", "title"],
          include: [{ model: Company, attributes: ["name"] }],
        },
        {
          model: User,
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    return successResponse(res, applications);
  } catch (error) {
    console.error("Admin error listing all applications:", error);
    return res.status(500).json({
      message: "فشل في جلب جميع طلبات التوظيف.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] تحديث حالة طلب توظيف معين (قبول، رفض، مراجعة)
 * @route PUT /api/admin/applications/:id
 * @access Admin
 */
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, review_notes } = req.body;

  const validStatuses = [
    "pending",
    "reviewed",
    "shortlisted",
    "accepted",
    "hired",
    "rejected",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: `الحالة غير صالحة. يجب أن تكون واحدة من: ${validStatuses.join(
        ", "
      )}`,
    });
  }

  try {
    const application = await Application.findByPk(id);

    if (!application) {
      return res.status(404).json({ message: "طلب التوظيف غير موجود." });
    }

    await application.update({
      status: status,
      review_notes: review_notes || application.review_notes,
    });

    return successResponse(
      res,
      {
        application_id: application.application_id,
        status: application.status,
        review_notes: application.review_notes,
      },
      `تم تحديث حالة طلب التوظيف بنجاح إلى ${status}.`
    );
  } catch (error) {
    console.error("Admin error updating application status:", error);
    return res
      .status(500)
      .json({ message: "فشل في تحديث حالة الطلب.", error: error.message });
  }
};

//  دوال إدارة السير الذاتية (Admin CV Management)

/**
 * @desc [Admin Only] عرض جميع سجلات السير الذاتية المرفوعة
 * @route GET /api/admin/cvs
 * @access Admin
 */
exports.listAllCVs = async (req, res) => {
  try {
    const cvs = await CV.findAll({
      attributes: ["cv_id", "title", "file_url", "file_type", "created_at"],
      include: [
        {
          model: User,
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 100,
    });

    return successResponse(res, cvs);
  } catch (error) {
    console.error("Admin error listing all CVs:", error);
    return res.status(500).json({
      message: "فشل في جلب جميع سجلات السير الذاتية.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] جلب أحدث سيرة ذاتية لمستخدم معين وتنزيلها (افتراضياً)
 * @route GET /api/admin/cvs/:userId/download
 * @access Admin
 */
exports.getAndDownloadUserCV = async (req, res) => {
  const { userId } = req.params;

  try {
    const cv = await CV.findOne({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });

    if (!cv) {
      return res
        .status(404)
        .json({ message: "لا توجد سيرة ذاتية مُسجّلة لهذا المستخدم." });
    }

    const filePath = cv.file_url;
    // يجب التأكد من أن file_url يشير لمسار محلي يمكن قراءته
    if (fs.existsSync(filePath)) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${userId}_${cv.cv_id}.pdf`
      );
      res.setHeader("Content-Type", cv.file_type || "application/pdf");
      return res.sendFile(filePath);
    } else {
      return res
        .status(404)
        .json({ message: "ملف السيرة الذاتية غير موجود في مسار التخزين." });
    }
  } catch (error) {
    console.error("Admin error fetching/downloading user CV:", error);
    return res.status(500).json({
      message: "فشل في جلب أو تنزيل السيرة الذاتية.",
      error: error.message,
    });
  }
};

//  دوال إدارة طلبات الشركات (Admin Company Requests)

/**
 * @desc [Admin Only] عرض جميع طلبات تسجيل الشركات
 * @route GET /api/admin/company-requests
 * @access Admin
 */
exports.listCompanyRequests = async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: [
        "company_id",
        "name",
        "email",
        "phone",
        "description",
        "logo_mimetype",
        "license_mimetype",
        "is_approved",
        "rejected_at",
        "rejection_reason",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    const requests = companies.map((company) => {
      const status = company.is_approved
        ? "approved"
        : company.rejected_at
        ? "rejected"
        : "pending";

      const logoUrl = company.logo_mimetype
        ? buildCompanyLogoUrl(company.company_id)
        : null;
      const licenseUrl = company.license_mimetype
        ? buildCompanyLicenseUrl(company.company_id)
        : null;

      return {
        request_id: company.company_id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        license_doc_url: licenseUrl,
        description: company.description,
        logo_url: logoUrl,
        status,
        admin_review_notes: company.rejection_reason,
        approved_company_id: company.is_approved ? company.company_id : null,
        created_at: company.createdAt,
      };
    });

    return successResponse(res, requests);
  } catch (error) {
    res.status(500).json({
      message: "Server error while listing company requests.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] Get a company request by ID
 * @route GET /api/company-requests/:id
 * @access Admin
 */
exports.getCompanyRequestById = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      attributes: [
        "company_id",
        "name",
        "email",
        "phone",
        "description",
        "logo_mimetype",
        "license_mimetype",
        "is_approved",
        "rejected_at",
        "rejection_reason",
        "createdAt",
      ],
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const status = company.is_approved
      ? "approved"
      : company.rejected_at
      ? "rejected"
      : "pending";

    const logoUrl = company.logo_mimetype
      ? buildCompanyLogoUrl(company.company_id)
      : null;
    const licenseUrl = company.license_mimetype
      ? buildCompanyLicenseUrl(company.company_id)
      : null;

    return successResponse(res, {
      request_id: company.company_id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      license_doc_url: licenseUrl,
      description: company.description,
      logo_url: logoUrl,
      status,
      admin_review_notes: company.rejection_reason,
      approved_company_id: company.is_approved ? company.company_id : null,
      created_at: company.createdAt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching company request.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] الموافقة على طلب شركة وإنشاء حسابها
 * @route PUT /api/admin/company-requests/approve/:id
 * @access Admin
 */
exports.approveCompanyRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const company = await Company.findByPk(req.params.id, { transaction: t });

    if (!company) {
      await t.rollback();
      return res.status(404).json({ message: "Company not found." });
    }

    if (company.is_approved) {
      await t.rollback();
      return res.status(400).json({ message: "Company is already approved." });
    }

    company.is_approved = true;
    company.approved_at = new Date();
    company.rejected_at = null;
    company.rejection_reason = null;
    await company.save({ transaction: t });

    await t.commit();

    const subject = "Talents - Company Approved";
    const textBody = `Hello ${company.name},

Your company has been approved on Talents. You can now log in and start using the platform.

If you need any help, reply to this email or contact support.

Thanks,
Talents Team`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Talents, ${company.name}</h2>
        <p>Your company has been approved. You can now log in and start using the platform.</p>
        <p>If you need any help, reply to this email or contact support.</p>
        <p>Thanks,<br/>Talents Team</p>
      </div>
    `;

    let emailError = null;
    try {
      await sendEmail(company.email, subject, textBody, { html: htmlBody });
    } catch (err) {
      console.error("Approval email failed:", err);
      emailError = err;
    }

    const companyPayload = company.toJSON ? company.toJSON() : { ...company };
    delete companyPayload.logo_data;
    delete companyPayload.license_doc_data;
    delete companyPayload.password;

    return successResponse(
      res,
      { company: companyPayload, email_sent: !emailError },
      emailError
        ? "Company approved, but email failed to send."
        : "Company approved successfully."
    );
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      message: "Server error while approving company.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] رفض طلب شركة وتحديث حالته
 * @route PUT /api/admin/company-requests/reject/:id
 * @access Admin
 */
exports.rejectCompanyRequest = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    if (company.is_approved) {
      return res.status(400).json({ message: "Approved companies cannot be rejected." });
    }

    const { admin_review_notes } = req.body;
    if (!admin_review_notes) {
      return res.status(400).json({
        message: "admin_review_notes is required to reject a company.",
      });
    }

    company.is_approved = false;
    company.approved_at = null;
    company.rejected_at = new Date();
    company.rejection_reason = admin_review_notes;
    await company.save();

    try {
      const existingUser = await User.findOne({ where: { email: company.email } });
      if (!existingUser) {
        await User.create({
          full_name: company.name,
          email: company.email,
          hashed_password: company.password || "",
          user_type: "seeker",
          profile_completed: false,
          is_active: true,
        });
      } else if (existingUser.user_type !== "admin") {
        await existingUser.update({
          user_type: "seeker",
          hashed_password: company.password || existingUser.hashed_password,
          is_active: true,
        });
      }
    } catch (userError) {
      console.error("Failed to sync rejected company to user:", userError);
    }

    const subject = "Talents - Company Registration Update";
    const textBody = `Hello ${company.name},

We reviewed your company registration on Talents, but we cannot approve it yet.

Reason from the admin:
${admin_review_notes}

Please update your information and try again with the correct details.
If you need help, reply to this email or contact support.

Thanks,
Talents Team`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Talents Registration Update</h2>
        <p>We reviewed your company registration, but we cannot approve it yet.</p>
        <p><strong>Admin note:</strong></p>
        <blockquote style="background: #f5f5f5; padding: 12px; border-left: 4px solid #ddd;">
          ${admin_review_notes}
        </blockquote>
        <p>Please update your information and try again with the correct details.</p>
        <p>If you need help, reply to this email or contact support.</p>
        <p>Thanks,<br/>Talents Team</p>
      </div>
    `;

    let emailError = null;
    try {
      await sendEmail(company.email, subject, textBody, { html: htmlBody });
    } catch (err) {
      console.error("Rejection email failed:", err);
      emailError = err;
    }

    const companyPayload = company.toJSON ? company.toJSON() : { ...company };
    delete companyPayload.logo_data;
    delete companyPayload.license_doc_data;
    delete companyPayload.password;

    return successResponse(
      res,
      { rejectedCompany: companyPayload, email_sent: !emailError },
      emailError
        ? "Company rejected, but email failed to send."
        : "Company rejected and email sent."
    );
  } catch (error) {
    res.status(500).json({
      message: "Server error while rejecting company.",
      error: error.message,
    });
  }
};

// 💡 يمكن إضافة دالة لحذف شركة هنا:
/* @desc [Private/Admin] حذف شركة
 * @route DELETE /api/admin/companies/:id
 * @access Private (يتطلب دور Admin)
 */
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    // 1. التحقق من وجود الشركة
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    // 2. [تحسين] يجب الانتباه هنا:
    //    قد تحتاج إلى التعامل مع الكيانات المرتبطة مثل إعلانات الوظائف (JobPostings)
    //    والتطبيقات (Applications). يمكنك:
    //    أ. حذفها جميعاً (باستخدام ON DELETE CASCADE في تعريف النموذج).
    //    ب. أو منع الحذف إذا كانت هناك وظائف نشطة (لضمان سلامة البيانات).

    // 3. تنفيذ الحذف
    await company.destroy();

    // 4. الرد بنجاح
    return successResponse(res, null, "تم حذف الشركة بنجاح");
  } catch (error) {
    console.error("Error deleting company:", error);
    // إذا كان الخطأ بسبب قيود المفتاح الخارجي (Foreign Key)
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        message: "لا يمكن حذف الشركة، لوجود وظائف أو بيانات مرتبطة بها.",
        error: error.message,
      });
    }

    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء حذف الشركة", error: error.message });
  }
};
