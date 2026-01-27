// file: src/controllers/companies.controller.js (الملف المُحدث والنهائي)

const { Company, CompanyUser, JobPosting, Application, User, CV } = require("../models");
const bcrypt = require("bcryptjs");
const { successResponse } = require("../utils/responseHandler");

//   O_U^O

/**
 * @desc [Public] List approved companies
 * @route GET /api/companies
 * @access Public
 */
exports.listApprovedCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      where: { is_approved: true },
      attributes: [
        "company_id",
        "name",
        "logo_mimetype",
        "description",
        "email",
      ],
      order: [["name", "ASC"]],
    });

    const payload = companies.map(toPublicCompany);
    return successResponse(res, payload);
  } catch (error) {
    console.error("Error listing approved companies:", error);
    return res.status(500).json({
      message: "Server error while listing companies.",
      error: error.message,
    });
  }
};

/**
 * @desc [Public] Get approved company details
 * @route GET /api/companies/:id
 * @access Public
 */
exports.getApprovedCompanyDetails = async (req, res) => {
  try {
    const company = await Company.findOne({
      where: { company_id: req.params.id, is_approved: true },
      attributes: [
        "company_id",
        "name",
        "email",
        "phone",
        "description",
        "logo_mimetype",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!company) {
      return res
        .status(404)
        .json({ message: "Company not found or not approved." });
    }

    const publicCompanyDetails = toPublicCompany(company);
    return successResponse(res, publicCompanyDetails);
  } catch (error) {
    console.error("Error getting approved company details:", error);
    return res.status(500).json({
      message: "Server error while fetching company details.",
      error: error.message,
    });
  }
};

const getCompanyApprovalStatus = (company) => {
  if (company.is_approved) return "approved";
  if (company.rejected_at) return "rejected";
  return "pending";
};

const buildLogoUrl = (companyId) => `/api/companies/${companyId}/logo`;

const toPublicCompany = (company) => {
  const data = company.toJSON ? company.toJSON() : { ...company };
  const logoUrl = data.logo_mimetype ? buildLogoUrl(data.company_id) : null;

  return {
    ...data,
    logo_url: logoUrl,
    logo_data: undefined,
    logo_mimetype: undefined,
    license_doc_data: undefined,
    license_mimetype: undefined,
    password: undefined,
  };
};

/**
 * @desc [Public] Company registration (pending approval)
 * @route POST /api/companies/register
 * @access Public
 */
exports.registerCompany = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is required." });
  }

  const {
    name,
    email,
    phone,
    description,
    password,
    confirm_password,
  } = req.body;

  if (!name || !email || !password || !confirm_password) {
    return res.status(400).json({
      message:
        "Please provide company name, email, license document, and password.",
    });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters.",
    });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const logoFile = req.files?.logo?.[0] || null;
    const licenseFile = req.files?.license_doc?.[0] || null;

    const existingCompany = await Company.findOne({
      where: { email: normalizedEmail },
    });
    const existingCompanyUser = await CompanyUser.findOne({
      where: { email: normalizedEmail },
    });
    if (existingCompanyUser && !existingCompany) {
      return res.status(409).json({
        message: "هذا البريد مسجل بالفعل لحساب شركة.",
      });
    }
    if (existingCompany) {
      if (existingCompany.is_approved) {
        return res.status(409).json({
          message: "Account already approved. Please login.",
        });
      }

      if (existingCompany.rejected_at) {
        const hasExistingLicense = Boolean(existingCompany.license_doc_data);
        if (!licenseFile && !hasExistingLicense) {
          return res.status(400).json({
            message: "License document file is required.",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const updatePayload = {
          name,
          phone,
          description,
          password: hashedPassword,
          password_set_at: new Date(),
          is_approved: false,
          rejected_at: null,
          rejection_reason: null,
          approved_at: null,
        };

        if (logoFile) {
          updatePayload.logo_data = logoFile.buffer;
          updatePayload.logo_mimetype = logoFile.mimetype;
        }

        if (licenseFile) {
          updatePayload.license_doc_data = licenseFile.buffer;
          updatePayload.license_mimetype = licenseFile.mimetype;
        }

        await existingCompany.update(updatePayload);

        const primaryCompanyUser = await CompanyUser.findOne({
          where: { company_id: existingCompany.company_id, is_primary: true },
        });
        if (primaryCompanyUser) {
          await primaryCompanyUser.update({
            email: normalizedEmail,
            hashed_password: hashedPassword,
            is_active: true,
          });
        } else {
          await CompanyUser.create({
            company_id: existingCompany.company_id,
            email: normalizedEmail,
            hashed_password: hashedPassword,
            is_primary: true,
            is_active: true,
          });
        }

        return successResponse(
          res,
          {
            company_id: existingCompany.company_id,
            status: getCompanyApprovalStatus(existingCompany),
          },
          "Your company registration was re-submitted for review.",
        );
      }

      return res.status(409).json({
        message: "Your company is already pending approval.",
      });
    }

    if (!licenseFile) {
      return res.status(400).json({
        message: "License document file is required.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const company = await Company.create({
      name,
      email: normalizedEmail,
      phone,
      description,
      password: hashedPassword,
      password_set_at: new Date(),
      logo_data: logoFile ? logoFile.buffer : null,
      logo_mimetype: logoFile ? logoFile.mimetype : null,
      license_doc_data: licenseFile.buffer,
      license_mimetype: licenseFile.mimetype,
      is_approved: false,
      rejected_at: null,
      rejection_reason: null,
      approved_at: null,
    });

    await CompanyUser.create({
      company_id: company.company_id,
      email: normalizedEmail,
      hashed_password: hashedPassword,
      is_primary: true,
      is_active: true,
    });

    return successResponse(
      res,
      {
        company_id: company.company_id,
        status: getCompanyApprovalStatus(company),
      },
      "Company registration submitted. Pending admin approval.",
      201,
    );
  } catch (error) {
    console.error("Error registering company:", error);
    return res.status(500).json({
      message: "Server error while registering company.",
      error: error.message,
    });
  }
};

//   دوال الوصول العام (Public/Seeker Company Access)

/**
 * @desc [Public] Company registration (legacy route)
 * @route POST /api/company-requests
 * @access Public
 */
exports.submitCompanyRequest = exports.registerCompany;

//  دوال الإدارة (Admin/Internal Company Management)

/**
 * @desc [Private/Admin] إنشاء شركة جديدة مباشرة (تجاوز الطلب)
 * @route POST /api/admin/companies
 * @access Private (يتطلب دور Admin)
 */
exports.createCompany = async (req, res) => {
  const { name, email, phone, description, is_approved = true } = req.body;
  try {
    const logoFile = req.files?.logo?.[0] || null;
    const licenseFile = req.files?.license_doc?.[0] || null;

    if (!licenseFile) {
      return res.status(400).json({
        message: "License document file is required.",
      });
    }

    const newCompany = await Company.create({
      name,
      email,
      phone,
      logo_data: logoFile ? logoFile.buffer : null,
      logo_mimetype: logoFile ? logoFile.mimetype : null,
      description,
      license_doc_data: licenseFile.buffer,
      license_mimetype: licenseFile.mimetype,
      is_approved,
      approved_at: is_approved ? new Date() : null,
      rejected_at: null,
      rejection_reason: null,
    });
    return successResponse(
      res,
      toPublicCompany(newCompany),
      "تم إنشاء الشركة بنجاح",
      201
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء إنشاء الشركة", error: error.message });
  }
};

/**
 * @desc [Private/Admin] عرض جميع الشركات (مع أو بدون اعتماد)
 * @route GET /api/admin/companies
 * @access Private (يتطلب دور Admin)
 */
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: { exclude: ["logo_data", "license_doc_data", "password"] },
    });
    const payload = companies.map(toPublicCompany);
    return successResponse(res, payload);
  } catch (error) {
    console.error("Error fetching all companies:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب الشركات", error: error.message });
  }
};

/**
 * @desc [Private/Admin] عرض تفاصيل شركة واحدة (بما في ذلك الحقول الداخلية)
 * @route GET /api/admin/companies/:id
 * @access Private (يتطلب دور Admin)
 */
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      attributes: { exclude: ["logo_data", "license_doc_data", "password"] },
    });
    if (!company) return res.status(404).json({ message: "الشركة غير موجودة" });
    return successResponse(res, toPublicCompany(company));
  } catch (error) {
    console.error("Error getting company by ID:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب الشركة", error: error.message });
  }
};

/**
 * @desc [Private/Admin] تعديل بيانات شركة
 * @route PUT /api/admin/companies/:id
 * @access Private (يتطلب دور Admin)
 */
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ message: "الشركة غير موجودة" });

    const { is_verified, ...updateData } = req.body;
    updateData.is_approved =
      is_verified !== undefined ? is_verified : req.body.is_approved;

    if (updateData.is_approved === true) {
      updateData.approved_at = new Date();
      updateData.rejected_at = null;
      updateData.rejection_reason = null;
    } else if (updateData.is_approved === false) {
      updateData.approved_at = null;
    }

    await company.update(updateData);
    return successResponse(
      res,
      toPublicCompany(company),
      "تم تحديث بيانات الشركة بنجاح"
    );
  } catch (error) {
    console.error("Error updating company:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء تحديث الشركة", error: error.message });
  }
};

/**
 * @desc [Company] Dashboard إحصائيات الشركة
 * @route GET /api/company/dashboard
 * @access Private (Company)
 */
exports.getCompanyDashboard = async (req, res) => {
  try {
    const company = req.company;
    const companyId = company.company_id;

    // عدد الوظائف
    const jobsCount = await JobPosting.count({
      where: { company_id: companyId },
    });

    // عدد التقديمات على وظائف الشركة
    const applicationsCount = await Application.count({
      include: [
        {
          model: JobPosting,
          where: { company_id: companyId },
          attributes: [],
        },
      ],
    });

    return successResponse(res, {
      company_name: company.name,
      jobs_count: jobsCount,
      applications_count: applicationsCount,
    });
  } catch (error) {
    console.error("Error getting company dashboard:", error);
    return res.status(500).json({
      message: "فشل في جلب بيانات لوحة التحكم",
      error: error.message,
    });
  }
};

/**
 * @desc [Private/Admin] حذف شركة
 * @route DELETE /api/admin/companies/:id
 * @access Private (يتطلب دور Admin)
 */
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ message: "الشركة غير موجودة" });

    await company.destroy();
    return successResponse(res, null, "تم حذف الشركة بنجاح");
  } catch (error) {
    console.error("Error deleting company:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء حذف الشركة", error: error.message });
  }
};

//  دوال لوحة تحكم الشركة (Company Dashboard)

/**
 * @desc [Company] عرض بيانات الشركة الشخصية
 * @route GET /api/company/profile
 * @access Private (Company)
 */
exports.getCompanyProfile = async (req, res) => {
  try {
    const company = req.company;

    const { is_approved, ...rest } = company.toJSON();
    const profileData = toPublicCompany(rest);
    profileData.status = company.is_approved
      ? "approved"
      : company.rejected_at
      ? "rejected"
      : "pending";
    profileData.is_approved = company.is_approved;

    return successResponse(res, profileData);
  } catch (error) {
    console.error("Error getting company profile:", error);
    return res.status(500).json({
      message: "فشل في جلب بيانات الشركة",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] تعديل بيانات الشركة الشخصية (مع رفع صورة)
 * @route PUT /api/company/profile
 * @access Private (Company)
 */
exports.updateCompanyProfile = async (req, res) => {
  try {
    const company = req.company;
    const { name, phone, description } = req.body;

    const updateData = {
      name,
      phone,
      description,
    };

    // 🆕 في حال تم رفع صورة جديدة
    if (req.file) {
      updateData.logo_data = req.file.buffer;
      updateData.logo_mimetype = req.file.mimetype;
    }

    await company.update(updateData);

    return successResponse(
      res,
      toPublicCompany(company),
      "تم تحديث بيانات الشركة بنجاح"
    );
  } catch (error) {
    console.error("Error updating company profile:", error);
    return res.status(500).json({
      message: "فشل في تحديث بيانات الشركة",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] Add extra company user (up to 5 emails total)
 * @route POST /api/companies/company/users
 * @access Private (Company, Approved)
 */
exports.addCompanyUser = async (req, res) => {
  try {
    const company = req.company;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "البريد الإلكتروني وكلمة المرور مطلوبان.",
      });
    }

    const totalUsers = await CompanyUser.count({
      where: { company_id: company.company_id },
    });

    if (totalUsers >= 5) {
      return res.status(400).json({
        message: "تم الوصول للحد الأقصى (5) من الحسابات المسموحة للشركة.",
      });
    }

    const existingEmail = await CompanyUser.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        message: "هذا البريد مسجل مسبقاً.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const companyUser = await CompanyUser.create({
      company_id: company.company_id,
      email,
      hashed_password: hashedPassword,
      is_primary: false,
      is_active: true,
    });

    return successResponse(
      res,
      {
        company_user_id: companyUser.company_user_id,
        email: companyUser.email,
      },
      "تم إضافة حساب شركة جديد بنجاح."
    );
  } catch (error) {
    console.error("Error adding company user:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إضافة حساب الشركة.",
      error: error.message,
    });
  }
};

/**
 * @desc [Public] Get company logo
 * @route GET /api/companies/:id/logo
 * @access Public
 */
exports.getCompanyLogo = async (req, res) => {
  try {
    const company = await Company.findOne({
      where: { company_id: req.params.id, is_approved: true },
      attributes: ["company_id", "logo_data", "logo_mimetype"],
    });

    if (!company || !company.logo_data) {
      return res.status(404).json({ message: "Company logo not found." });
    }

    res.setHeader(
      "Content-Type",
      company.logo_mimetype || "application/octet-stream"
    );
    return res.send(company.logo_data);
  } catch (error) {
    console.error("Error fetching company logo:", error);
    return res.status(500).json({
      message: "Server error while fetching company logo.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin] Get company license document
 * @route GET /api/companies/admin/:id/license
 * @access Admin
 */
exports.getCompanyLicenseDoc = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      attributes: ["company_id", "license_doc_data", "license_mimetype"],
    });

    if (!company || !company.license_doc_data) {
      return res.status(404).json({ message: "License document not found." });
    }

    res.setHeader(
      "Content-Type",
      company.license_mimetype || "application/octet-stream"
    );
    return res.send(company.license_doc_data);
  } catch (error) {
    console.error("Error fetching company license doc:", error);
    return res.status(500).json({
      message: "Server error while fetching license document.",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] تحديث حالة طلب توظيف
 * @route PUT /api/company/applications/:id
 * @access Private (Company)
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, review_notes } = req.body;
    const applicationId = req.params.id;
    const company = req.company;

    const application = await Application.findOne({
      include: [
        {
          model: JobPosting,
          where: { company_id: company.company_id },
        },
      ],
      where: { application_id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ message: "طلب التوظيف غير موجود" });
    }

    await application.update({
      status,
      review_notes: review_notes || null,
    });

    return successResponse(res, application, "تم تحديث حالة الطلب بنجاح");
  } catch (error) {
    console.error("Error updating application status:", error);
    return res.status(500).json({
      message: "فشل في تحديث حالة الطلب",
      error: error.message,
    });
  }
};

/**
 * @desc [Company Only] عرض المتقدمين للوظائف الخاصة بالشركة فقط
 * @route GET /api/company/applications
 * @access Private (Company)
 */
exports.getCompanyApplications = async (req, res) => {
  try {
    // نستخدم req.company.company_id الذي تم إعداده في middleware verifyCompany
    const company_id = req.company.company_id;

    const jobId = req.query.job_id;

    const applications = await Application.findAll({
      include: [
        {
          model: User, // الـ Join مع جدول الموظف (User)
          attributes: [
            "user_id",
            "full_name",
            "email",
            "phone",
            "profile_completed",
          ],
        },
        {
          model: JobPosting,
          where: {
            company_id: company_id,
            ...(jobId ? { job_id: jobId } : {}),
          }, // فلترة لضمان جلب وظائف هذه الشركة فقط + اختيارياً حسب job_id
          attributes: ["job_id", "title", "location"],
        },
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    return successResponse(res, applications, "تم جلب المتقدمين بنجاح.");
  } catch (error) {
    console.error("Error fetching company applications:", error);
    return res.status(500).json({
      message: "فشل في جلب طلبات التوظيف.",
      error: error.message,
    });
  }
};

exports.getCompanyApplicationsByID = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const application_id = req.params.id;

    const application = await Application.findOne({
      include: [
        {
          model: User,
          attributes: [
            "user_id",
            "full_name",
            "email",
            "phone",
            "profile_completed",
          ],
        },
        {
          model: JobPosting,
          where: { company_id: company_id },
          attributes: [
            "job_id",
            "title",
            "location",
            "description",
            "requirements",
            "salary_min",
            "salary_max",
            "form_type",
            "external_form_url",
          ],
        },
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title"],
        },
      ],
      where: { application_id: application_id },
    });

    if (!application) {
      return res.status(404).json({ message: "طلب التوظيف غير موجود" });
    }

    return successResponse(res, application, "تم جلب بيانات الطلب بنجاح.");
  } catch (error) {
    console.error("Error fetching company application by ID:", error);
    return res.status(500).json({
      message: "فشل في جلب بيانات الطلب.",
      error: error.message,
    });
  }
};
