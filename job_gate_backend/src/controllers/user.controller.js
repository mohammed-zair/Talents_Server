// file: src/controllers/user.controller.js (الملف المُدمج والنهائي)

const {
  User,
  Company,
  JobPosting,
  Application,
  CV,
  sequelize,
  Admin,
  JobForm,
  JobFormField,
} = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { successResponse, errorResponse } = require("../utils/responseHandler"); // نفترض وجودها

// افترض أن ملف الإعدادات يحوي JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is missing in .env");
}
// ==============================
// Forgot / Reset Password Helpers
// ==============================
const RESET_PASSWORD_TOKEN_EXPIRES_MIN = parseInt(
  process.env.RESET_PASSWORD_TOKEN_EXPIRES_MIN || "30",
  10
);

const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));

const buildCompanyLogoUrl = (companyId) => `/api/companies/${companyId}/logo`;

const withCompanyLogoUrl = (company) => {
  if (!company) return company;
  const data = company.toJSON ? company.toJSON() : { ...company };
  const logoUrl = data.logo_mimetype
    ? buildCompanyLogoUrl(data.company_id)
    : null;
  return {
    ...data,
    logo_url: logoUrl,
    logo_mimetype: undefined,
  };
};
//   دوال المصادقة (Authentication Functions)

/**
 * @desc [Public] تسجيل الدخول للمستخدم (Admin, Seeker)
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return errorResponse(
        res,
        "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        null,
        404
      );
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) {
      return errorResponse(
        res,
        "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        null,
        400
      );
    }

    // إنشاء JWT
    const token = jwt.sign(
      { user_id: user.user_id, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN  }
    );

    const responseUser = user.toJSON();
    delete responseUser.hashed_password;

    return successResponse(res, { token, user: responseUser }, "تم تسجيل الدخول بنجاح.");
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "حدث خطأ أثناء تسجيل الدخول.", error, 500);
  }
};

/**
 * @desc [Public] إنشاء حساب مستخدم باحث عن عمل جديد
 * @route POST /api/auth/register-jobseeker
 * @access Public
 */
exports.registerJobSeeker = async (req, res) => {
  const { full_name, email, password, phone, user_type } = req.body;

  // بدء عملية (Transaction) لضمان حفظ البيانات في الجدولين معاً
  const t = await sequelize.transaction();

  try {
    // 1. التحقق من وجود المستخدم مسبقاً
    let existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await t.rollback();
      return errorResponse(res, "المستخدم مسجل مسبقاً.", null, 400);
    }

    // 2. تشفير كلمة المرور
    const hashed_password = await bcrypt.hash(password, 10);

    // 3. إنشاء السجل في جدول المستخدمين العام (User)
    const user = await User.create(
      {
        full_name,
        email,
        hashed_password,
        phone,
        user_type: user_type === "admin" ? "admin" : "seeker",
        profile_completed: false,
      },
      { transaction: t }
    );

    // 4. إذا كان النوع "admin"، نقوم بإضافته في جدول الأدمن أيضاً
    if (user_type === "admin") {
      // نفترض أن اسم الموديل هو Admin وأن العلاقة هي user_id
      await Admin.create(
        {
          user_id: user.user_id,
          full_name,
          email,
          hashed_password,
          phone, // ربط السجل بالمستخدم الذي أنشئ للتو
          // أضف أي حقول إضافية خاصة بالأدمن هنا
        },
        { transaction: t }
      );
    }

    // تأكيد العملية وحفظ البيانات نهائياً
    await t.commit();

    // 5. إنشاء JWT
    const token = jwt.sign(
      { user_id: user.user_id, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN  }
    );

    const responseUser = user.toJSON();
    delete responseUser.hashed_password;

    return successResponse(
      res,
      { token, user: responseUser },
      "تم تسجيل الحساب بنجاح وإضافة البيانات في الجداول المختصة.",
      201
    );
  } catch (error) {
    // تراجع عن أي تغيير في حال حدوث خطأ
    await t.rollback();
    console.error("Registration error:", error);
    return errorResponse(res, "حدث خطأ أثناء عملية التسجيل.", error, 500);
  }
};

// ==============================
// Forgot / Reset Password (Public)
// ==============================

/**
 * @desc [Public] طلب إعادة تعيين كلمة المرور (يرسل رابط على البريد)
 * @route POST /api/auth/forgot-password
 * @access Public
 *
 * body: { email }
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return errorResponse(res, "Please provide your email address.", null, 400);
    }

    const genericMsg = "If the email is registered, an OTP reset code has been sent.";
    const user = await User.findOne({ where: { email } });

    // Security: do not reveal whether the email exists.
    if (!user) {
      return successResponse(res, null, genericMsg);
    }

    const otpCode = generateOtpCode();
    const hashedToken = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRES_MIN * 60 * 1000);

    user.reset_password_token = hashedToken;
    user.reset_password_expires = expiresAt;
    user.reset_password_sent_at = new Date();
    await user.save();

    const subject = "Password Reset OTP - Talents We Trust";
    const text =
      `Hello ${user.full_name || ""},\n\n` +
      "We received a password reset request for your account.\n\n" +
      `Your OTP code is: ${otpCode}\n` +
      `This code expires in ${RESET_PASSWORD_TOKEN_EXPIRES_MIN} minutes.\n\n` +
      "If you did not request this, please ignore this email.\n";

    await sendEmail(email, subject, text);

    return successResponse(res, null, genericMsg);
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse(res, "Failed to process forgot-password request.", null, 500);
  }
};


/**
 * @desc [Public] إعادة تعيين كلمة المرور باستخدام token
 * @route POST /api/auth/reset-password
 * @access Public
 *
 * body: { email, token, newPassword }
 */
exports.resetPassword = async (req, res) => {
  const { email, token, newPassword, code, password } = req.body;
  const providedToken = String(token || code || "").trim();
  const providedNewPassword = String(newPassword || password || "");

  try {
    if (!email || !providedToken || !providedNewPassword) {
      return errorResponse(
        res,
        "Please provide email, OTP code, and new password.",
        null,
        400
      );
    }

    if (providedNewPassword.length < 6) {
      return errorResponse(res, "New password must be at least 6 characters.", null, 400);
    }

    const hashedToken = crypto.createHash("sha256").update(providedToken).digest("hex");

    const user = await User.findOne({
      where: {
        email,
        reset_password_token: hashedToken,
      },
    });

    if (!user) {
      return errorResponse(res, "Invalid OTP code or email.", null, 400);
    }

    if (!user.reset_password_expires || user.reset_password_expires < new Date()) {
      return errorResponse(res, "OTP has expired. Please request a new one.", null, 400);
    }

    user.hashed_password = await bcrypt.hash(providedNewPassword, 10);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    user.reset_password_sent_at = null;

    await user.save();

    const newJwt = jwt.sign(
      { user_id: user.user_id, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const responseUser = user.toJSON();
    delete responseUser.hashed_password;

    return successResponse(
      res,
      { token: newJwt, user: responseUser },
      "Password reset successfully."
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse(res, "Failed to reset password.", null, 500);
  }
};


//   دوال الوصول العام (Public Access Functions)

/**
 * @desc [Public] عرض قائمة بالشركات المعتمدة
 * @route GET /api/companies
 * @access Public
 */
exports.listCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: ["company_id", "name", "logo_mimetype", "description"],
      where: { is_approved: true }, // عرض الموافق عليها فقط
    });
    const payload = companies.map(withCompanyLogoUrl);
    return successResponse(res, payload);
  } catch (error) {
    console.error("Error listing companies:", error);
    return res.status(500).json({ message: "فشل في جلب قائمة الشركات." });
  }
};

/**
 * @desc [Public] عرض جميع إعلانات الوظائف المنشورة والنشطة
 * @route GET /api/jobs
 * @access Public
 */
exports.listJobPostings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "0", 10), 0);
    const limit = Math.max(parseInt(req.query.limit || "0", 10), 0);
    const companyId = req.query.company_id || req.query.companyId;

    const where = { status: "open" };
    if (companyId) where.company_id = companyId;

    const attributes = [
      "job_id",
      "title",
      "description",
      "location",
      "industry",
      "salary_min",
      "salary_max",
      "form_type",
      "job_image_url",
      "created_at",
    ];

    const include = [
      {
        model: Company,
        attributes: ["company_id", "name", "logo_mimetype"],
      },
    ];

    if (limit > 0) {
      const offset = page * limit;
      const { rows, count } = await JobPosting.findAndCountAll({
        where,
        attributes,
        include,
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

      const items = rows.map((posting) => {
        const data = posting.toJSON ? posting.toJSON() : { ...posting };
        if (data.Company) data.Company = withCompanyLogoUrl(data.Company);
        return data;
      });

      const pages = limit ? Math.ceil(count / limit) : 1;
      return successResponse(res, { items, page, limit, total: count, pages });
    }

    const jobPostings = await JobPosting.findAll({
      where,
      attributes,
      include,
      order: [["created_at", "DESC"]],
    });

    const payload = jobPostings.map((posting) => {
      const data = posting.toJSON ? posting.toJSON() : { ...posting };
      if (data.Company) data.Company = withCompanyLogoUrl(data.Company);
      return data;
    });

    return successResponse(res, payload);
  } catch (error) {
    console.error("Error listing job postings:", error);
    return res
      .status(500)
      .json({ message: "فشل في جلب إعلانات الوظائف.", error: error.message });
  }
};

/**
 * @desc [Public] عرض تفاصيل وظيفة محددة
 * @route GET /api/jobs/:id
 * @access Public
 */
exports.getJobPostingDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const jobPosting = await JobPosting.findByPk(id, {
      where: {
        status: "open",
      },
      attributes: [
        "job_id",
        "title",
        "description",
        "requirements",
        "location",
        "industry",
        "salary_min",
        "salary_max",
        "form_type",
        "job_image_url",
        "created_at",
      ],
      include: [
        {
          model: Company,
          attributes: [
            "company_id",
            "name",
            "logo_mimetype",
            "description",
            "email",
          ],
        },
        // [تضمين هيكل JobForm هنا إذا لزم الأمر، كما كان في النسخة الثانية]
      ],
    });

    if (!jobPosting) {
      return res
        .status(404)
        .json({ message: "الوظيفة غير موجودة أو غير متاحة حالياً." });
    }

    const payload = jobPosting.toJSON ? jobPosting.toJSON() : { ...jobPosting };
    if (payload.Company) {
      payload.Company = withCompanyLogoUrl(payload.Company);
    }
    return successResponse(res, payload);
  } catch (error) {
    console.error("Error getting job posting details:", error);
    return res
      .status(500)
      .json({ message: "فشل في جلب تفاصيل الوظيفة.", error: error.message });
  }
};

/**
 * @desc [Public] جلب فورم التقديم الخاص بالوظيفة
 * @route GET /api/jop_seeker/job-postings/:id/form
 * @access Public
 */
exports.getJobApplicationForm = async (req, res) => {
  const { id } = req.params;

  try {
    const jobPosting = await JobPosting.findOne({
      where: {
        job_id: id,
        status: "open",
      },
      attributes: [
        "job_id",
        "title",
        "form_type",
        "external_form_url",
      ],
      include: [
        {
          model: JobForm,
          attributes: ["form_id", "require_cv"],
          include: [
            {
              model: JobFormField,
              attributes: [
                "field_id",
                "title",
                "description",
                "is_required",
                "input_type",
                "options",
              ],
            },
          ],
        },
      ],
    });

    if (!jobPosting) {
      return errorResponse(
        res,
        "الوظيفة غير موجودة أو غير متاحة حالياً.",
        null,
        404
      );
    }

    // في حال كان النموذج خارجي
    if (jobPosting.form_type === "external_link") {
      return successResponse(res, {
        form_type: "external_link",
        external_form_url: jobPosting.external_form_url,
      });
    }

    // في حال كان فورم داخلي
    if (!jobPosting.JobForm) {
      return errorResponse(
        res,
        "لا يوجد نموذج تقديم مرتبط بهذه الوظيفة.",
        null,
        404
      );
    }

    return successResponse(res, {
      form_type: "internal_form",
      require_cv: jobPosting.JobForm.require_cv,
      fields: jobPosting.JobForm.JobFormFields || [],
    });
  } catch (error) {
    console.error("Error fetching job application form:", error);
    return errorResponse(
      res,
      "فشل في جلب نموذج التقديم.",
      error,
      500
    );
  }
};

//   دوال الباحث عن عمل (Authenticated Job Seeker)

/**
 * @desc [Private] تقديم طلب وظيفة جديد (يدعم cv_id أو ملف مرفوع)
 * @route POST /api/user/applications
 * @access Private (يتطلب authJwt و middleware الرفع)
 */
exports.submitApplication = async (req, res) => {
  // دمج الحقول من كلا النموذجين
  const { job_id, cv_id, cover_letter, form_data } = req.body;
  const { user_id } = req.user;
  const uploadedFile = req.file;

  const t = await sequelize.transaction();
  try {
    // 1. التحقق من الوظيفة والتقديم المسبق
    const job = await JobPosting.findByPk(job_id, { transaction: t });
    if (!job || job.status !== "open") {
      await t.rollback();
      return res.status(404).json({ message: "الوظيفة غير موجودة أو مغلقة." });
    }

    const existingApplication = await Application.findOne({
      where: { user_id, job_id },
      transaction: t,
    });
    if (existingApplication) {
      await t.rollback();
      return res.status(400).json({ message: "لقد قدمت بالفعل لهذه الوظيفة." });
    }

    let finalCvId = cv_id;

    // 2. معالجة السيرة الذاتية (ملف مرفوع جديد أو cv_id مسجل)
    if (uploadedFile) {
      // رفع ملف جديد => إنشاء سجل CV
      const newCV = await CV.create(
        {
          user_id,
          file_url: uploadedFile.path,
          file_type: uploadedFile.mimetype,
          title: `مرفق لطلب وظيفة ${job_id} بتاريخ ${new Date()
            .toISOString()
            .slice(0, 10)}`,
        },
        { transaction: t }
      );
      finalCvId = newCV.cv_id;
    } else if (finalCvId) {
      // تحديد CV مُسجل => التحقق من ملكيته
      const userCv = await CV.findOne({
        where: { cv_id: finalCvId, user_id },
        transaction: t,
      });
      if (!userCv) {
        await t.rollback();
        return res.status(403).json({
          message: "السيرة الذاتية المحددة غير صالحة أو لا تخص المستخدم.",
        });
      }
    } else {
      // لا ملف ولا CV محدد
      await t.rollback();
      return res
        .status(400)
        .json({ message: "يجب إرفاق ملف CV أو تحديد CV مسجل." });
    }

    // 3. إنشاء طلب التقديم
    const application = await Application.create(
      {
        user_id,
        job_id,
        cv_id: finalCvId,
        cover_letter: cover_letter || null,
        form_data: form_data ? JSON.parse(form_data) : null, // دعم بيانات النموذج من النسخة الثانية
        status: "pending",
      },
      { transaction: t }
    );

    await t.commit();

    return successResponse(
      res,
      { application_id: application.application_id },
      "تم إرسال طلب التوظيف بنجاح.",
      201
    );
  } catch (error) {
    await t.rollback();
    // (يجب أن يتم التعامل مع حذف الملف المرفوع إذا فشلت العملية في middleware أو خدمة خارجية)

    console.error("Error submitting application:", error);
    return res
      .status(500)
      .json({ message: "فشل في إرسال الطلب.", error: error.message });
  }
};

/**
 * @desc [Private] عرض جميع طلبات التوظيف التي قدمها المستخدم الحالي
 * @route GET /api/user/applications
 * @access Private (يتطلب authJwt)
 */
exports.listUserApplications = async (req, res) => {
  const { user_id } = req.user;

  try {
    const applicationAttributes = [
      "application_id",
      "status",
      "submitted_at",
      "review_notes",
    ];

    // Keep query compatible with environments where this legacy column is absent.
    if (Application.rawAttributes?.cover_letter) {
      applicationAttributes.push("cover_letter");
    }

    const applications = await Application.findAll({
      where: { user_id },
      attributes: applicationAttributes,
      include: [
        {
          model: JobPosting,
          attributes: ["job_id", "title", "status", "location"],
          include: [{ model: Company, attributes: ["name"] }],
        },
        {
          model: CV,
          attributes: ["cv_id", "title", "file_url"],  
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    return successResponse(res, applications);
  } catch (error) {
    console.error("Error listing user applications (rich query):", error);

    // Resilience fallback: return minimal application list instead of 500.
    try {
      const fallbackApps = await Application.findAll({
        where: { user_id },
        attributes: ["application_id", "status", "submitted_at"],
        order: [["submitted_at", "DESC"]],
      });

      const normalized = fallbackApps.map((app) => ({
        application_id: app.application_id,
        status: app.status,
        submitted_at: app.submitted_at,
        JobPosting: null,
        CV: null,
      }));

      return successResponse(
        res,
        normalized,
        "Applications loaded with limited details due to a temporary data issue."
      );
    } catch (fallbackError) {
      console.error("Error listing user applications (fallback query):", fallbackError);

      // Last-resort fallback to keep client stable.
      return successResponse(
        res,
        [],
        "Applications are temporarily unavailable. Please try again later."
      );
    }
  }
};

