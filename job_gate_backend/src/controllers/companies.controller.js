// file: src/controllers/companies.controller.js (الملف المُحدث والنهائي)

const { Company, CompanyUser, CompanyEmailOtp, JobPosting, Application, User, CV, CVAIInsights, CVStructuredData, CVFeaturesAnalytics } = require("../models");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { successResponse } = require("../utils/responseHandler");
const sendEmail = require("../utils/sendEmail");
const aiService = require("../services/aiService");

//   O_U^O
const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeIndustryScore = (value) => {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  if (n >= 0 && n <= 1) return Number((n * 100).toFixed(2));
  return n;
};

const resolveApplicationScore = (aiInsights, featuresAtsScore) => {
  const aiAtsScore = toFiniteNumber(aiInsights?.ats_score);
  if (aiAtsScore !== null) return aiAtsScore;

  const industryScore = normalizeIndustryScore(aiInsights?.industry_ranking_score);
  if (industryScore !== null) return industryScore;

  return toFiniteNumber(featuresAtsScore);
};

/**
 * @desc [Public] List approved companies
 * @route GET /api/companies
 * @access Public
 */
exports.listApprovedCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      where: buildApprovedCompanyWhere(),
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
      where: buildApprovedCompanyWhere({ company_id: req.params.id }),
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
      include: [
        {
          model: JobPosting,
          where: { status: "open", is_anonymous: false },
          required: false,
          attributes: [
            "job_id",
            "title",
            "location",
            "description",
            "job_image_url",
            "is_remote",
          ],
        },
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

const buildApprovedCompanyWhere = (extra = {}) => {
  const base = Company.rawAttributes?.status
    ? { status: "approved", is_deleted: false }
    : { is_approved: true, is_deleted: false };
  return { ...base, ...extra };
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

const resolveLanguage = (req) => {
  const bodyLang = String(req.body?.language || req.body?.lang || "").toLowerCase();
  const headerLang = String(req.headers["x-language"] || "").toLowerCase();
  const acceptLanguage = String(req.headers["accept-language"] || "").toLowerCase();
  const candidate = bodyLang || headerLang || acceptLanguage;
  return candidate.startsWith("ar") ? "ar" : "en";
};

const normalizePreferredLanguage = (value, fallback = "en") => {
  const candidate = String(value || "").toLowerCase();
  if (candidate.startsWith("ar")) return "ar";
  if (candidate.startsWith("en")) return "en";
  return fallback === "ar" ? "ar" : "en";
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildCompanyPendingApprovalTemplate = ({ companyName, language = "en" }) => {
  const safeCompanyName = String(companyName || "there").trim();
  const safeCompanyNameHtml = escapeHtml(safeCompanyName);
  const isArabic = language === "ar";

  if (isArabic) {
    const subject = "مرحباً بك في Talents - تم استلام تسجيل شركتك";
    const textBody =
      `مرحباً ${safeCompanyName}،\n\n` +
      "أهلاً بك في Talents. تم استلام تسجيل شركتك وهو الآن قيد المراجعة.\n\n" +
      "ماذا سيحدث بعد ذلك:\n" +
      "- سيقوم فريقنا بالتحقق من بيانات الشركة والوثائق المرفوعة.\n" +
      "- بعد الموافقة، يمكنك نشر الوظائف وإدارة طلبات التوظيف مباشرة.\n\n" +
      "كيف ستستفيد شركتك من Talents:\n" +
      "- الوصول بسرعة إلى مرشحين مؤهلين.\n" +
      "- إدارة عملية التوظيف كاملة من مكان واحد.\n" +
      "- تحسين جودة الاختيار عبر تحليلات السيرة الذاتية ودعم المطابقة.\n\n" +
      "شكراً لثقتك. سنرسل لك رسالة جديدة فور اكتمال المراجعة.\n\n" +
      "مع تحياتنا،\n" +
      "فريق Talents";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;" dir="rtl">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
            <h2 style="margin:0; font-size:20px;">مرحباً بك في Talents</h2>
            <p style="margin:6px 0 0; opacity:.9;">تسجيل شركتك قيد الموافقة</p>
          </div>
          <div style="padding:22px; color:#111827;">
            <p style="margin:0 0 12px;">مرحباً <strong>${safeCompanyNameHtml}</strong>،</p>
            <p style="margin:0 0 14px;">
              شكراً لتسجيل شركتك في Talents. تم إنشاء حساب شركتك وهو الآن
              <strong>قيد المراجعة</strong>.
            </p>
            <p style="margin:0 0 10px;">الخطوات القادمة:</p>
            <ul style="margin:0 0 14px 18px; padding:0; color:#374151;">
              <li>مراجعة بيانات الشركة والوثائق المرفوعة.</li>
              <li>بعد الموافقة يمكنك البدء فوراً بنشر الوظائف.</li>
              <li>ستصلك رسالة تأكيد بمجرد اعتماد الحساب.</li>
            </ul>
            <p style="margin:0 0 10px;">كيف يساعد Talents شركتك:</p>
            <ul style="margin:0 0 14px 18px; padding:0; color:#374151;">
              <li>الوصول السريع إلى مرشحين مؤهلين.</li>
              <li>إدارة التوظيف بالكامل من النشر حتى الاختيار.</li>
              <li>قرارات توظيف أدق عبر تحليلات السيرة الذاتية.</li>
            </ul>
            <p style="margin:0; color:#6b7280;">
              سعداء بانضمامكم إلينا، ونتطلع لدعم نمو فريقكم بثقة.
            </p>
            <p style="margin:14px 0 0; color:#111827;">مع تحياتنا،<br/>فريق Talents</p>
          </div>
        </div>
      </div>
    `;

    return { subject, textBody, htmlBody };
  }

  const subject = "Welcome to Talents - Registration Received";
  const textBody =
    `Hello ${safeCompanyName},\n\n` +
    "Welcome to Talents. We have received your company registration and it is currently under review.\n\n" +
    "What you can expect next:\n" +
    "- Our team will verify your company details and documents.\n" +
    "- Once approved, you can immediately post jobs and manage applications.\n\n" +
    "How Talents will help your company:\n" +
    "- Reach a qualified pool of candidates faster.\n" +
    "- Manage hiring in one place with structured applicant workflows.\n" +
    "- Improve hiring quality using CV insights and matching support.\n\n" +
    "We appreciate your patience. You will receive another email as soon as your account is approved.\n\n" +
    "Best regards,\n" +
    "Talents Team";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
          <h2 style="margin:0; font-size:20px;">Welcome to Talents</h2>
          <p style="margin:6px 0 0; opacity:.9;">Your registration is pending approval</p>
        </div>
        <div style="padding:22px; color:#111827;">
          <p style="margin:0 0 12px;">Hello <strong>${safeCompanyNameHtml}</strong>,</p>
          <p style="margin:0 0 14px;">
            Thank you for registering with Talents. Your company account has been created and is now
            <strong>under review</strong>.
          </p>
          <p style="margin:0 0 10px;">What happens next:</p>
          <ul style="margin:0 0 14px 18px; padding:0; color:#374151;">
            <li>We verify your company details and submitted documents.</li>
            <li>Once approved, you can start posting jobs right away.</li>
            <li>You will receive an approval email as soon as review is complete.</li>
          </ul>
          <p style="margin:0 0 10px;">How Talents supports your hiring growth:</p>
          <ul style="margin:0 0 14px 18px; padding:0; color:#374151;">
            <li>Faster access to qualified candidates.</li>
            <li>Centralized hiring workflow from posting to shortlist.</li>
            <li>Smarter screening with CV insights and better matching.</li>
          </ul>
          <p style="margin:0; color:#6b7280;">
            We are excited to have you with us and look forward to helping your team hire with confidence.
          </p>
          <p style="margin:14px 0 0; color:#111827;">Best regards,<br/>Talents Team</p>
        </div>
      </div>
    </div>
  `;

  return { subject, textBody, htmlBody };
};

const getAdminPortalUrl = () =>
  process.env.TALENTS_ADMIN_PORTAL_URL || "https://admin.talents-we-trust.tech";

const buildAdminPendingCompanyTemplate = ({ companyName, companyEmail, companyPhone }) => {
  const safeName = escapeHtml(companyName || "Company");
  const safeEmail = escapeHtml(companyEmail || "-");
  const safePhone = escapeHtml(companyPhone || "-");
  const adminPortalUrl = getAdminPortalUrl();
  const subject = "New Company Registration Pending Approval";
  const textBody =
    "Hello Admin,\n\n" +
    "A new company registration is waiting for approval on Talents.\n\n" +
    `Company: ${companyName || "-"}\n` +
    `Email: ${companyEmail || "-"}\n` +
    `Phone: ${companyPhone || "-"}\n\n` +
    `Review now: ${adminPortalUrl}\n\n` +
    "Talents Team";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
          <h2 style="margin:0; font-size:20px;">New Company Awaiting Approval</h2>
          <p style="margin:6px 0 0; opacity:.9;">Talents Admin Notification</p>
        </div>
        <div style="padding:22px; color:#111827;">
          <p style="margin:0 0 12px;">A company has completed registration and is now pending admin approval:</p>
          <table style="width:100%; border-collapse:collapse; margin:0 0 14px;">
            <tr>
              <td style="padding:8px; border:1px solid #e5e7eb; width:160px; color:#6b7280;">Company</td>
              <td style="padding:8px; border:1px solid #e5e7eb;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #e5e7eb; color:#6b7280;">Email</td>
              <td style="padding:8px; border:1px solid #e5e7eb;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #e5e7eb; color:#6b7280;">Phone</td>
              <td style="padding:8px; border:1px solid #e5e7eb;">${safePhone}</td>
            </tr>
          </table>
          <p style="margin:0;">
            <a href="${adminPortalUrl}" style="display:inline-block; background:#111827; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600;">
              Open Admin Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  `;
  return { subject, textBody, htmlBody };
};

const notifyAdminsAboutPendingCompany = async ({ companyName, companyEmail, companyPhone }) => {
  try {
    const adminWhere = { user_type: "admin" };
    if (Object.prototype.hasOwnProperty.call(User.rawAttributes || {}, "is_active")) {
      adminWhere.is_active = true;
    }

    const admins = await User.findAll({
      where: adminWhere,
      attributes: ["user_id", "email"],
    });
    const recipients = Array.from(
      new Set(
        admins
          .map((admin) => String(admin.email || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (recipients.length === 0) return;

    const { subject, textBody, htmlBody } = buildAdminPendingCompanyTemplate({
      companyName,
      companyEmail,
      companyPhone,
    });

    await Promise.allSettled(
      recipients.map((recipient) =>
        sendEmail(recipient, subject, textBody, { html: htmlBody })
      )
    );
  } catch (error) {
    console.error("Failed to notify admins about pending company:", error);
  }
};

const COMPANY_REG_OTP_EXPIRES_MINUTES = parseInt(
  process.env.COMPANY_REG_OTP_EXPIRES_MINUTES || "10",
  10
);
const COMPANY_REG_OTP_MAX_ATTEMPTS = parseInt(
  process.env.COMPANY_REG_OTP_MAX_ATTEMPTS || "5",
  10
);
const COMPANY_REG_OTP_COOLDOWN_SECONDS = parseInt(
  process.env.COMPANY_REG_OTP_COOLDOWN_SECONDS || "60",
  10
);

const hashOtp = (code) =>
  crypto.createHash("sha256").update(String(code || "")).digest("hex");

const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));

const buildCompanyRegistrationOtpTemplate = ({ companyName, otpCode, language = "en" }) => {
  const safeCompanyName = String(companyName || "there").trim();
  const safeCompanyNameHtml = escapeHtml(safeCompanyName);
  const isArabic = language === "ar";

  if (isArabic) {
    const subject = "رمز التحقق لتسجيل شركة جديدة - Talents";
    const textBody =
      `مرحباً ${safeCompanyName}،\n\n` +
      "لإكمال تسجيل شركتك في Talents، استخدم رمز التحقق التالي:\n" +
      `${otpCode}\n\n` +
      `صلاحية الرمز: ${COMPANY_REG_OTP_EXPIRES_MINUTES} دقيقة.\n` +
      "إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.\n\n" +
      "فريق Talents";
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;" dir="rtl">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
            <h2 style="margin:0; font-size:20px;">Talents</h2>
            <p style="margin:6px 0 0; opacity:.9;">رمز التحقق لتسجيل الشركة</p>
          </div>
          <div style="padding:22px; color:#111827;">
            <p style="margin:0 0 12px;">مرحباً <strong>${safeCompanyNameHtml}</strong>،</p>
            <p style="margin:0 0 14px;">استخدم رمز التحقق التالي لإكمال تسجيل شركتك:</p>
            <div style="background:#f9fafb; border:1px dashed #d1d5db; border-radius:12px; padding:16px; text-align:center; margin:0 0 16px;">
              <div style="font-size:13px; color:#6b7280; margin-bottom:8px;">رمز التحقق</div>
              <div style="font-size:32px; font-weight:700; letter-spacing:6px; color:#111827;">${otpCode}</div>
            </div>
            <p style="margin:0 0 12px; color:#374151;">صلاحية الرمز: <strong>${COMPANY_REG_OTP_EXPIRES_MINUTES} دقيقة</strong>.</p>
            <p style="margin:0; color:#6b7280;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
            <p style="margin:14px 0 0; color:#111827;">فريق Talents</p>
          </div>
        </div>
      </div>
    `;
    return { subject, textBody, htmlBody };
  }

  const subject = "Company Registration Verification Code - Talents";
  const textBody =
    `Hello ${safeCompanyName},\n\n` +
    "Use this OTP code to complete your company registration on Talents:\n" +
    `${otpCode}\n\n` +
    `This code expires in ${COMPANY_REG_OTP_EXPIRES_MINUTES} minutes.\n` +
    "If you did not request this code, you can ignore this email.\n\n" +
    "Talents Team";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
          <h2 style="margin:0; font-size:20px;">Talents</h2>
          <p style="margin:6px 0 0; opacity:.9;">Company Registration Verification</p>
        </div>
        <div style="padding:22px; color:#111827;">
          <p style="margin:0 0 12px;">Hello <strong>${safeCompanyNameHtml}</strong>,</p>
          <p style="margin:0 0 14px;">Use this OTP code to complete your company registration:</p>
          <div style="background:#f9fafb; border:1px dashed #d1d5db; border-radius:12px; padding:16px; text-align:center; margin:0 0 16px;">
            <div style="font-size:13px; color:#6b7280; margin-bottom:8px;">OTP Code</div>
            <div style="font-size:32px; font-weight:700; letter-spacing:6px; color:#111827;">${otpCode}</div>
          </div>
          <p style="margin:0 0 12px; color:#374151;">This code expires in <strong>${COMPANY_REG_OTP_EXPIRES_MINUTES} minutes</strong>.</p>
          <p style="margin:0; color:#6b7280;">If you did not request this code, you can ignore this email.</p>
          <p style="margin:14px 0 0; color:#111827;">Talents Team</p>
        </div>
      </div>
    </div>
  `;

  return { subject, textBody, htmlBody };
};

exports.sendCompanyRegistrationOtp = async (req, res) => {
  try {
    const { email, company_name, companyName, name } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const language = resolveLanguage(req);
    const latestOtp = await CompanyEmailOtp.findOne({
      where: {
        email: normalizedEmail,
        purpose: "registration",
        consumed_at: null,
      },
      order: [["created_at", "DESC"]],
    });

    if (latestOtp) {
      const cooldownUntil = latestOtp.created_at.getTime() + COMPANY_REG_OTP_COOLDOWN_SECONDS * 1000;
      if (Date.now() < cooldownUntil) {
        return res.status(429).json({
          message: `Please wait ${COMPANY_REG_OTP_COOLDOWN_SECONDS} seconds before requesting another OTP.`,
        });
      }
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + COMPANY_REG_OTP_EXPIRES_MINUTES * 60 * 1000);
    await CompanyEmailOtp.create({
      email: normalizedEmail,
      purpose: "registration",
      otp_hash: hashOtp(otpCode),
      expires_at: expiresAt,
      attempts: 0,
      created_by_ip: req.ip,
      user_agent: req.get("user-agent") || null,
    });

    const { subject, textBody, htmlBody } = buildCompanyRegistrationOtpTemplate({
      companyName: company_name || companyName || name || normalizedEmail.split("@")[0],
      otpCode,
      language,
    });
    await sendEmail(normalizedEmail, subject, textBody, { html: htmlBody });

    return successResponse(
      res,
      {
        email: normalizedEmail,
        expires_in_minutes: COMPANY_REG_OTP_EXPIRES_MINUTES,
      },
      "Verification OTP has been sent to your email."
    );
  } catch (error) {
    console.error("Error sending company registration OTP:", error);
    return res.status(500).json({
      message: "Failed to send verification OTP.",
      error: error.message,
    });
  }
};

exports.verifyCompanyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp, code } = req.body || {};
    if (!email || (!otp && !code)) {
      return res.status(400).json({ message: "Email and OTP code are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const providedOtp = String(otp || code).trim();
    const otpRecord = await CompanyEmailOtp.findOne({
      where: {
        email: normalizedEmail,
        purpose: "registration",
        consumed_at: null,
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "No OTP request found for this email." });
    }
    if (otpRecord.verified_at) {
      return successResponse(res, { verified: true }, "Email already verified.");
    }
    if (otpRecord.expires_at < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new code." });
    }
    if (otpRecord.attempts >= COMPANY_REG_OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many invalid attempts. Please request a new code." });
    }

    const matches = hashOtp(providedOtp) === otpRecord.otp_hash;
    if (!matches) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: "Invalid OTP code." });
    }

    otpRecord.verified_at = new Date();
    await otpRecord.save();

    return successResponse(
      res,
      {
        verified: true,
        email: normalizedEmail,
      },
      "Email verified successfully."
    );
  } catch (error) {
    console.error("Error verifying company registration OTP:", error);
    return res.status(500).json({
      message: "Failed to verify OTP.",
      error: error.message,
    });
  }
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
    preferred_language,
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
    const language = resolveLanguage(req);
    const preferredLanguage = normalizePreferredLanguage(preferred_language, language);
    const normalizedEmail = String(email).trim().toLowerCase();
    const logoFile = req.files?.logo?.[0] || null;
    const licenseFile = req.files?.license_doc?.[0] || null;
    const verifiedOtp = await CompanyEmailOtp.findOne({
      where: {
        email: normalizedEmail,
        purpose: "registration",
        verified_at: { [Op.ne]: null },
        consumed_at: null,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["created_at", "DESC"]],
    });
    if (!verifiedOtp) {
      return res.status(400).json({
        message: "Please verify your email with OTP before registration.",
      });
    }

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
          preferred_language: preferredLanguage,
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
          updatePayload.license_doc_url = licenseFile.originalname || "uploaded";
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

        try {
          const { subject, textBody, htmlBody } = buildCompanyPendingApprovalTemplate({
            companyName: existingCompany.name,
            language: preferredLanguage,
          });
          await sendEmail(existingCompany.email, subject, textBody, { html: htmlBody });
        } catch (emailError) {
          console.error("Pending approval email failed (resubmission):", emailError);
        }
        await notifyAdminsAboutPendingCompany({
          companyName: existingCompany.name,
          companyEmail: existingCompany.email,
          companyPhone: existingCompany.phone,
        });

        verifiedOtp.consumed_at = new Date();
        await verifiedOtp.save();

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
      preferred_language: preferredLanguage,
      password: hashedPassword,
      password_set_at: new Date(),
      logo_data: logoFile ? logoFile.buffer : null,
      logo_mimetype: logoFile ? logoFile.mimetype : null,
      license_doc_data: licenseFile.buffer,
      license_mimetype: licenseFile.mimetype,
      license_doc_url: licenseFile.originalname || "uploaded",
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

    try {
      const { subject, textBody, htmlBody } = buildCompanyPendingApprovalTemplate({
        companyName: company.name,
        language: preferredLanguage,
      });
      await sendEmail(company.email, subject, textBody, { html: htmlBody });
    } catch (emailError) {
      console.error("Pending approval email failed (new registration):", emailError);
    }
    await notifyAdminsAboutPendingCompany({
      companyName: company.name,
      companyEmail: company.email,
      companyPhone: company.phone,
    });

    verifiedOtp.consumed_at = new Date();
    await verifiedOtp.save();

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
  const { name, email, phone, description, preferred_language, is_approved = true } = req.body;
  try {
    const preferredLanguage = normalizePreferredLanguage(preferred_language, "en");
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
      preferred_language: preferredLanguage,
      logo_data: logoFile ? logoFile.buffer : null,
      logo_mimetype: logoFile ? logoFile.mimetype : null,
      description,
      license_doc_data: licenseFile.buffer,
      license_mimetype: licenseFile.mimetype,
      license_doc_url: licenseFile.originalname || "uploaded",
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

    const jobsCount = await JobPosting.count({
      where: { company_id: companyId },
    });

    const applicationInclude = [
      {
        model: JobPosting,
        where: { company_id: companyId },
        attributes: ["job_id", "title", "location", "created_at"],
      },
      {
        model: User,
        attributes: ["user_id", "full_name", "email", "phone"],
      },
      {
        model: CV,
        attributes: ["cv_id", "file_url", "title", "file_type"],
        include: [
          { model: CVAIInsights },
          { model: CVFeaturesAnalytics, attributes: ["ats_score"] },
        ],
      },
    ];

    const applications = await Application.findAll({
      include: applicationInclude,
      order: [["submitted_at", "DESC"]],
    });

    const applicationsCount = applications.length;
    const pendingCount = applications.filter((a) => a.status === "pending").length;
    const reviewedCount = applications.filter((a) => a.status === "reviewed").length;
    const shortlistedCount = applications.filter((a) => a.status === "shortlisted").length;
    const acceptedCount = applications.filter((a) => a.status === "accepted").length;
    const hiredCount = applications.filter((a) => a.status === "hired").length;
    const rejectedCount = applications.filter((a) => a.status === "rejected").length;
    const starredCount = applications.filter((a) => a.is_starred).length;

    let topApplicant = null;
    const rankedApplicants = [];
    let aiScoreSum = 0;
    let aiScoreCount = 0;
    let atsScoreSum = 0;
    let atsScoreCount = 0;
    const highQualityCandidateIds = new Set();
    const jobStatsMap = new Map();

    applications.forEach((application) => {
      const data = application.toJSON ? application.toJSON() : application;
      const cv = data.CV;
      const job = data.JobPosting;
      const aiInsights =
        cv?.CVAIInsights?.find((item) => item.job_id === job?.job_id) || null;
      const score = resolveApplicationScore(
        aiInsights,
        cv?.CVFeaturesAnalytics?.ats_score
      );
      const atsScore = cv?.CVFeaturesAnalytics?.ats_score ?? null;

      if (typeof score === "number") {
        aiScoreSum += score;
        aiScoreCount += 1;
        if (score >= 85) {
          const candidateId = data.User?.user_id ?? data.user_id ?? null;
          if (candidateId !== null && candidateId !== undefined) {
            highQualityCandidateIds.add(String(candidateId));
          }
        }
      }
      if (typeof atsScore === "number") {
        atsScoreSum += atsScore;
        atsScoreCount += 1;
      }

      if (job?.job_id) {
        if (!jobStatsMap.has(job.job_id)) {
          jobStatsMap.set(job.job_id, {
            job_id: job.job_id,
            title: job.title ?? "Job",
            location: job.location ?? null,
            total_applications: 0,
            avg_ai_score: null,
            avg_ats_score: null,
            first_application_at: null,
            first_high_quality_at: null,
            created_at: job.created_at || null,
            starred_count: 0,
            pending_count: 0,
            reviewed_count: 0,
            shortlisted_count: 0,
            accepted_count: 0,
            hired_count: 0,
            rejected_count: 0,
            _ranked_applicants: [],
            _ai_sum: 0,
            _ai_count: 0,
            _ats_sum: 0,
            _ats_count: 0,
          });
        }
        const jobStat = jobStatsMap.get(job.job_id);
        jobStat.total_applications += 1;
        if (typeof score === "number") {
          jobStat._ai_sum += score;
          jobStat._ai_count += 1;
        }
        if (typeof atsScore === "number") {
          jobStat._ats_sum += atsScore;
          jobStat._ats_count += 1;
        }
        if (data.is_starred) {
          jobStat.starred_count += 1;
        }
        if (typeof score === "number") {
          jobStat._ranked_applicants.push({
            application_id: data.application_id,
            candidate: {
              id: data.User?.user_id ?? data.user_id ?? null,
              name: data.User?.full_name ?? data.full_name ?? "Candidate",
              email: data.User?.email ?? data.email ?? null,
            },
            job: {
              id: job?.job_id ?? null,
              title: job?.title ?? "Job",
            },
            ai_insights: aiInsights,
            score,
          });
        }

        const submittedAt = data.submitted_at || data.submittedAt || null;
        if (submittedAt) {
          const submittedDate = new Date(submittedAt);
          if (!jobStat.first_application_at || submittedDate < new Date(jobStat.first_application_at)) {
            jobStat.first_application_at = submittedDate.toISOString();
          }
          if (typeof score === "number" && score >= 85) {
            if (!jobStat.first_high_quality_at || submittedDate < new Date(jobStat.first_high_quality_at)) {
              jobStat.first_high_quality_at = submittedDate.toISOString();
            }
          }
        }

        switch (data.status) {
          case "pending":
            jobStat.pending_count += 1;
            break;
          case "reviewed":
            jobStat.reviewed_count += 1;
            break;
          case "shortlisted":
            jobStat.shortlisted_count += 1;
            break;
          case "accepted":
            jobStat.accepted_count += 1;
            break;
          case "hired":
            jobStat.hired_count += 1;
            break;
          case "rejected":
            jobStat.rejected_count += 1;
            break;
          default:
            break;
        }
      }

      if (typeof score === "number") {
        rankedApplicants.push({
          application_id: data.application_id,
          candidate: {
            id: data.User?.user_id ?? data.user_id ?? null,
            name: data.User?.full_name ?? data.full_name ?? "Candidate",
            email: data.User?.email ?? data.email ?? null,
          },
          job: {
            id: job?.job_id ?? null,
            title: job?.title ?? "Job",
          },
          ai_insights: aiInsights,
          score,
        });
      }
    });

    const topApplicants = rankedApplicants
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    topApplicant = topApplicants[0] ?? null;
    const latestJobPosting = await JobPosting.findOne({
      where: { company_id: companyId },
      attributes: ["job_id", "title", "created_at"],
      order: [["created_at", "DESC"]],
    });

    const latestJobStat = latestJobPosting
      ? jobStatsMap.get(latestJobPosting.job_id) || {
          job_id: latestJobPosting.job_id,
          title: latestJobPosting.title ?? "Job",
          created_at: latestJobPosting.created_at || null,
          total_applications: 0,
          starred_count: 0,
          _ai_sum: 0,
          _ai_count: 0,
          _ats_sum: 0,
          _ats_count: 0,
          _ranked_applicants: [],
        }
      : null;

    const latestJobTopApplicants = latestJobStat
      ? latestJobStat._ranked_applicants
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : [];
    const highQualityJobSeekersCount = highQualityCandidateIds.size;
    const highQualityJobSeekersX2 = highQualityJobSeekersCount * 2;

    return successResponse(res, {
      company_name: company.name,
      jobs_count: jobsCount,
      applications_count: applicationsCount,
      pending_count: pendingCount,
      reviewed_count: reviewedCount,
      shortlisted_count: shortlistedCount,
      accepted_count: acceptedCount,
      hired_count: hiredCount,
      rejected_count: rejectedCount,
      starred_count: starredCount,
      top_applicant: topApplicant,
      top_applicants: topApplicants,
      latest_job_offer: latestJobStat
        ? {
            job_id: latestJobStat.job_id,
            title: latestJobStat.title,
            created_at: latestJobStat.created_at,
            applications_count: latestJobStat.total_applications,
            avg_ai_score: latestJobStat._ai_count
              ? Number((latestJobStat._ai_sum / latestJobStat._ai_count).toFixed(2))
              : null,
            avg_ats_score: latestJobStat._ats_count
              ? Number((latestJobStat._ats_sum / latestJobStat._ats_count).toFixed(2))
              : null,
            starred_count: latestJobStat.starred_count || 0,
            top_applicants: latestJobTopApplicants,
          }
        : null,
      high_quality_job_seekers: highQualityJobSeekersCount,
      high_quality_job_seekers_x2: highQualityJobSeekersX2,
      avg_ai_score: aiScoreCount ? Number((aiScoreSum / aiScoreCount).toFixed(2)) : null,
      avg_ats_score: atsScoreCount ? Number((atsScoreSum / atsScoreCount).toFixed(2)) : null,
      job_stats: Array.from(jobStatsMap.values()).map((jobStat) => ({
        job_id: jobStat.job_id,
        title: jobStat.title,
        location: jobStat.location,
        created_at: jobStat.created_at,
        total_applications: jobStat.total_applications,
        avg_ai_score: jobStat._ai_count
          ? Number((jobStat._ai_sum / jobStat._ai_count).toFixed(2))
          : null,
        avg_ats_score: jobStat._ats_count
          ? Number((jobStat._ats_sum / jobStat._ats_count).toFixed(2))
          : null,
        starred_count: jobStat.starred_count,
        first_application_at: jobStat.first_application_at,
        first_high_quality_at: jobStat.first_high_quality_at,
        pending_count: jobStat.pending_count,
        reviewed_count: jobStat.reviewed_count,
        shortlisted_count: jobStat.shortlisted_count,
        accepted_count: jobStat.accepted_count,
        hired_count: jobStat.hired_count,
        rejected_count: jobStat.rejected_count,
      })),
    });
  } catch (error) {
    console.error("Error getting company dashboard:", error);
    return res.status(500).json({
      message: "Failed to fetch dashboard data.",
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
      where: { company_id: req.params.id, is_approved: true, is_deleted: false },
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
 * @desc [Public] Track company approval status
 * @route POST /api/companies/track
 * @access Public
 */
exports.trackCompanyApproval = async (req, res) => {
  try {
    const { email, request_id } = req.body || {};
    if (!email && !request_id) {
      return res.status(400).json({ message: "email or request_id is required." });
    }

    const where = {};
    if (email) {
      where.email = String(email).trim().toLowerCase();
    } else if (request_id) {
      where.company_id = request_id;
    }

    const company = await Company.findOne({ where });
    if (!company) {
      return res.status(404).json({ message: "Company request not found." });
    }

    return successResponse(res, {
      company_id: company.company_id,
      status: getCompanyApprovalStatus(company),
    });
  } catch (error) {
    console.error("Error tracking company approval:", error);
    return res.status(500).json({
      message: "Server error while tracking approval.",
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
    const validStatuses = [
      "pending",
      "reviewed",
      "shortlisted",
      "accepted",
      "hired",
      "rejected",
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

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
    const parseOptionalNumber = (value) => {
      if (value === undefined || value === null || String(value).trim() === "") {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const collectStrings = (value, bag = []) => {
      if (value == null) return bag;
      if (typeof value === "string") {
        const normalized = value.trim();
        if (normalized) bag.push(normalized);
        return bag;
      }
      if (typeof value === "number" || typeof value === "boolean") {
        bag.push(String(value));
        return bag;
      }
      if (Array.isArray(value)) {
        value.forEach((entry) => collectStrings(entry, bag));
        return bag;
      }
      if (typeof value === "object") {
        const objectValue = value;
        if (typeof objectValue.name === "string") bag.push(objectValue.name.trim());
        if (typeof objectValue.title === "string") bag.push(objectValue.title.trim());
        if (typeof objectValue.skill === "string") bag.push(objectValue.skill.trim());
        Object.values(objectValue).forEach((entry) => collectStrings(entry, bag));
      }
      return bag;
    };

    const getNestedValue = (obj, path) =>
      path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

    const extractSkillPool = (structured = {}, featureSkills = []) => {
      const sources = [
        featureSkills,
        structured.skills,
        structured.key_skills,
        structured.core_competencies,
        getNestedValue(structured, ["sections", "core_competencies", "data"]),
      ];
      const all = [];
      sources.forEach((source) => collectStrings(source, all));
      return Array.from(new Set(all.map((item) => String(item).trim()).filter(Boolean)));
    };

    const extractLocationValue = (structured = {}) => {
      return (
        getNestedValue(structured, ["personal_info", "location"]) ||
        getNestedValue(structured, ["contact_information", "location"]) ||
        getNestedValue(structured, ["sections", "contact_information", "data", "location"]) ||
        null
      );
    };

    const extractEducationText = (structured = {}) => {
      const sources = [
        structured.education,
        getNestedValue(structured, ["sections", "education", "data"]),
      ];
      const tokens = [];
      sources.forEach((source) => collectStrings(source, tokens));
      return tokens.join(" ").trim() || null;
    };

    const company_id = req.company.company_id;
    const jobId = req.query.job_id;
    const search = String(req.query.search || "").trim().toLowerCase();
    const atsMin = parseOptionalNumber(req.query.ats_min);
    const atsMax = parseOptionalNumber(req.query.ats_max);
    const experienceMin = parseOptionalNumber(req.query.experience_min);
    const experienceMax = parseOptionalNumber(req.query.experience_max);
    const skillsQuery = String(req.query.skills || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const educationQuery = String(req.query.education || "").trim().toLowerCase();
    const locationQuery = String(req.query.location || "").trim().toLowerCase();
    const strengthsQuery = String(req.query.strengths || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const weaknessesQuery = String(req.query.weaknesses || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const starredQuery = String(req.query.starred || "").toLowerCase();

    const applications = await Application.findAll({
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
          where: {
            company_id: company_id,
            ...(jobId ? { job_id: jobId } : {}),
          },
          attributes: ["job_id", "title", "location", "description", "requirements"],
        },
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title", "file_type"],
          include: [
            { model: CVStructuredData, attributes: ["data_json"] },
            { model: CVFeaturesAnalytics, attributes: ["ats_score", "total_years_experience", "key_skills"] },
            { model: CVAIInsights },
          ],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    let payload = applications.map((application) => {
      const data = application.toJSON ? application.toJSON() : application;
      const cv = data.CV;
      let ai_insights = null;
      let ai_score = null;
      let experienceYears = null;
      let skillPool = [];
      let location = null;
      let education = null;

      if (cv?.CVAIInsights && data.JobPosting) {
        ai_insights = cv.CVAIInsights.find(
          (item) => item.job_id === data.JobPosting.job_id
        ) || null;
      }

      if (cv?.CVFeaturesAnalytics) {
        ai_score = resolveApplicationScore(
          ai_insights,
          cv.CVFeaturesAnalytics.ats_score
        );
        experienceYears = cv.CVFeaturesAnalytics.total_years_experience ?? null;
        skillPool = Array.isArray(cv.CVFeaturesAnalytics.key_skills)
          ? cv.CVFeaturesAnalytics.key_skills
          : [];
      }

      const structured = cv?.CVStructuredData?.data_json || {};
      skillPool = extractSkillPool(structured, skillPool);
      location = extractLocationValue(structured);
      education = extractEducationText(structured);

      return {
        ...data,
        ai_insights,
        ai_score,
        candidate_location: location,
        candidate_education: education,
        candidate_experience_years: experienceYears,
        candidate_skills: skillPool,
      };
    });

    if (search) {
      payload = payload.filter((item) => {
        const candidateName = String(item.User?.full_name ?? item.full_name ?? "").toLowerCase();
        const jobTitle = String(item.JobPosting?.title ?? item.job_title ?? "").toLowerCase();
        const jobLocation = String(item.JobPosting?.location ?? item.location ?? "").toLowerCase();
        const email = String(item.User?.email ?? item.email ?? "").toLowerCase();
        return (
          candidateName.includes(search) ||
          jobTitle.includes(search) ||
          jobLocation.includes(search) ||
          email.includes(search)
        );
      });
    }

    if (starredQuery === "true" || starredQuery === "false") {
      const starredValue = starredQuery === "true";
      payload = payload.filter((item) => Boolean(item.is_starred) === starredValue);
    }

    if (typeof atsMin === "number") {
      payload = payload.filter((item) => typeof item.ai_score === "number" && item.ai_score >= atsMin);
    }

    if (typeof atsMax === "number") {
      payload = payload.filter((item) => typeof item.ai_score === "number" && item.ai_score <= atsMax);
    }

    if (typeof experienceMin === "number") {
      payload = payload.filter(
        (item) =>
          typeof item.candidate_experience_years === "number" &&
          item.candidate_experience_years >= experienceMin
      );
    }

    if (typeof experienceMax === "number") {
      payload = payload.filter(
        (item) =>
          typeof item.candidate_experience_years === "number" &&
          item.candidate_experience_years <= experienceMax
      );
    }

    if (skillsQuery.length) {
      payload = payload.filter((item) => {
        const skills = Array.isArray(item.candidate_skills) ? item.candidate_skills : [];
        const bag = skills.map((skill) => String(skill).toLowerCase());
        return skillsQuery.every((querySkill) => bag.some((skill) => skill.includes(querySkill)));
      });
    }

    if (educationQuery) {
      payload = payload.filter((item) =>
        String(item.candidate_education || "").toLowerCase().includes(educationQuery)
      );
    }

    if (locationQuery) {
      payload = payload.filter((item) =>
        String(item.candidate_location || "").toLowerCase().includes(locationQuery)
      );
    }

    if (strengthsQuery.length) {
      payload = payload.filter((item) => {
        const strengths = [
          ...(item.ai_insights?.ai_intelligence?.strategic_analysis?.strengths || []),
          ...(item.ai_insights?.ai_intelligence?.strengths || []),
        ];
        const bag = strengths.map((value) => String(value).toLowerCase());
        return strengthsQuery.every((querySkill) => bag.some((skill) => skill.includes(querySkill)));
      });
    }

    if (weaknessesQuery.length) {
      payload = payload.filter((item) => {
        const weaknesses = [
          ...(item.ai_insights?.ai_intelligence?.strategic_analysis?.weaknesses || []),
          ...(item.ai_insights?.ai_intelligence?.weaknesses || []),
        ];
        const bag = weaknesses.map((value) => String(value).toLowerCase());
        return weaknessesQuery.every((querySkill) => bag.some((skill) => skill.includes(querySkill)));
      });
    }

    return successResponse(res, payload, "Applications retrieved successfully.");
  } catch (error) {
    console.error("Error fetching company applications:", error);
    return res.status(500).json({
      message: "Failed to fetch applications.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin] Get company logo (including pending/rejected)
 * @route GET /api/companies/admin/:id/logo
 * @access Admin
 */
exports.getCompanyLogoAdmin = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
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
    console.error("Error fetching admin company logo:", error);
    return res.status(500).json({
      message: "Server error while fetching company logo.",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] Toggle star on an application
 * @route PUT /api/companies/company/applications/:id/star
 * @access Private (Company)
 */
exports.toggleApplicationStar = async (req, res) => {
  try {
    const company = req.company;
    const applicationId = req.params.id;
    const { starred } = req.body;

    const application = await Application.findOne({
      include: [
        {
          model: JobPosting,
          where: { company_id: company.company_id },
          attributes: ["job_id"],
        },
      ],
      where: { application_id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const nextValue =
      typeof starred === "boolean" ? starred : !Boolean(application.is_starred);
    await application.update({ is_starred: nextValue });

    return successResponse(res, { application_id: applicationId, is_starred: nextValue });
  } catch (error) {
    console.error("Error toggling application star:", error);
    return res.status(500).json({
      message: "Failed to update star.",
      error: error.message,
    });
  }
};

exports.getCompanyApplicationsByID = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const application_id = req.params.id;
    const refreshInsights =
      String(req.query.refresh || "").toLowerCase() === "true" ||
      String(req.query.refresh || "") === "1";

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
          attributes: ["cv_id", "file_url", "title", "file_type"],
          include: [
            { model: CVStructuredData, attributes: ["data_json"] },
            { model: CVFeaturesAnalytics, attributes: ["ats_score", "total_years_experience", "key_skills"] },
          ],
        },
      ],
      where: { application_id: application_id },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const applicationData = application.toJSON ? application.toJSON() : application;
    const cv = applicationData.CV;
    const job = applicationData.JobPosting;
    let aiInsights = null;

    if (cv?.cv_id) {
      aiInsights = await CVAIInsights.findOne({
        where: {
          cv_id: cv.cv_id,
          job_id: job?.job_id || null,
        },
      });

      if ((refreshInsights || !aiInsights) && cv.file_url && job) {
        const rawPath = String(cv.file_url);
        const backendRoot = path.join(__dirname, "..", "..");
        const normalized = rawPath.replace(/^\/+/, "");
        const filePath = path.isAbsolute(rawPath)
          ? rawPath
          : path.join(backendRoot, normalized);

        if (fs.existsSync(filePath)) {
          const jobDescription = [job.description, job.requirements]
            .filter(Boolean)
            .join("\n\n")
            .trim();
          const fileObj = {
            path: filePath,
            originalname: cv.title || `cv_${cv.cv_id}`,
            mimetype: cv.file_type || "application/pdf",
          };

          try {
            const aiResult = await aiService.analyzeCVFile(
              applicationData.user_id,
              fileObj,
              true,
              { job_description: jobDescription }
            );

            if (aiResult?.ai_intelligence || aiResult?.competency_matrix) {
              const mergedIntelligence = aiResult?.ai_intelligence
                ? {
                    ...aiResult.ai_intelligence,
                    ...(aiResult.competency_matrix
                      ? { competency_matrix: aiResult.competency_matrix }
                      : {}),
                  }
                : { competency_matrix: aiResult.competency_matrix };
              if (aiInsights) {
                await aiInsights.update({
                  ai_intelligence: mergedIntelligence,
                  ats_score: aiResult.ats_score ?? null,
                  industry_ranking_score: aiResult.industry_ranking_score ?? null,
                  industry_ranking_label: aiResult.industry_ranking_label ?? null,
                  cleaned_job_description: aiResult.cleaned_job_description ?? null,
                  analysis_method: aiResult.analysis_method ?? null,
                  updated_at: new Date(),
                });
              } else {
                aiInsights = await CVAIInsights.create({
                  cv_id: cv.cv_id,
                  job_id: job.job_id,
                  ai_intelligence: mergedIntelligence,
                  ats_score: aiResult.ats_score ?? null,
                  industry_ranking_score: aiResult.industry_ranking_score ?? null,
                  industry_ranking_label: aiResult.industry_ranking_label ?? null,
                  cleaned_job_description: aiResult.cleaned_job_description ?? null,
                  analysis_method: aiResult.analysis_method ?? null,
                });
              }
            }
          } catch (aiError) {
            console.error("AI insight generation failed:", aiError);
          }
        }
      }
    }

    const aiScore = resolveApplicationScore(
      aiInsights,
      applicationData?.CV?.CVFeaturesAnalytics?.ats_score
    );

    const payload = {
      ...applicationData,
      ai_insights: aiInsights ? aiInsights.toJSON() : null,
      ai_score: aiScore,
    };

    return successResponse(res, payload, "Application details retrieved.");
  } catch (error) {
    console.error("Error fetching company application by ID:", error);
    return res.status(500).json({
      message: "Failed to fetch application details.",
      error: error.message,
    });
  }
};


/**
 * @desc [Company Only] Download CV for a specific application (must belong to company)
 * @route GET /api/companies/company/applications/:id/cv
 * @access Private (Company)
 */
exports.downloadApplicationCv = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const application_id = req.params.id;

    const application = await Application.findOne({
      include: [
        {
          model: JobPosting,
          where: { company_id: company_id },
          attributes: ["job_id", "title"],
        },
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title"],
        },
      ],
      where: { application_id: application_id },
    });

    if (!application) {
      return res.status(404).json({ message: "??? ??????? ??? ?????" });
    }

    const cv = application.CV;
    if (!cv || !cv.file_url) {
      return res.status(404).json({ message: "CV ??? ????? ???? ?????" });
    }

    const rawPath = String(cv.file_url);
    const backendRoot = path.join(__dirname, "..", "..");
    const normalized = rawPath.replace(/^\/+/, "");
    const filePath = path.isAbsolute(rawPath)
      ? rawPath
      : path.join(backendRoot, normalized);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "??? ?????? ??? ?????" });
    }

    const filename = cv.title ? `${cv.title}` : `cv_${cv.cv_id}`;
    return res.download(filePath, filename);
  } catch (error) {
    console.error("Error downloading CV:", error);
    return res.status(500).json({
      message: "??? ?? ????? ?????? ???????.",
      error: error.message,
    });
  }
};
