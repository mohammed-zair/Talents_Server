// file: src/controllers/user.controller.js (الملف المُدمج والنهائي)

const {
  User,
  Company,
  JobPosting,
  Application,
  CV,
  CVFeaturesAnalytics,
  UserEmailOtp,
  sequelize,
  Admin,
  JobForm,
  JobFormField,
} = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const sendEmail = require("../utils/sendEmail");
const { successResponse, errorResponse } = require("../utils/responseHandler"); // نفترض وجودها
const { maskCompanyIfAnonymous } = require("../utils/companyBranding");

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
const USER_REG_OTP_EXPIRES_MINUTES = parseInt(
  process.env.USER_REG_OTP_EXPIRES_MINUTES || "10",
  10
);
const USER_REG_OTP_MAX_ATTEMPTS = parseInt(
  process.env.USER_REG_OTP_MAX_ATTEMPTS || "5",
  10
);
const ACCOUNT_DELETE_OTP_EXPIRES_MINUTES = parseInt(
  process.env.ACCOUNT_DELETE_OTP_EXPIRES_MINUTES || "10",
  10
);
const ACCOUNT_DELETE_OTP_MAX_ATTEMPTS = parseInt(
  process.env.ACCOUNT_DELETE_OTP_MAX_ATTEMPTS || "5",
  10
);
const USER_REG_OTP_COOLDOWN_SECONDS = parseInt(
  process.env.USER_REG_OTP_COOLDOWN_SECONDS || "60",
  10
);
const CONTACT_EMAIL_TO = String(
  process.env.CONTACT_INBOX_EMAIL || "talentswetrust@gmail.com"
)
  .trim()
  .toLowerCase();
const CONTACT_RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.CONTACT_RATE_LIMIT_WINDOW_MS || "60000",
  10
);
const contactRateLimitMap = new Map();
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const withCompanyLogoUrl = (company) => maskCompanyIfAnonymous({ is_anonymous: false }, company);

const getCompanyApplicationsUrl = () => {
  const base =
    process.env.TALENTS_COMPANY_PORTAL_URL ||
    process.env.TALENTS_PORTAL_URL ||
    "https://companies.talents-we-trust.tech";
  return `${String(base).replace(/\/+$/, "")}/applications`;
};

const resolveCompanyNotificationLanguage = (req, company) => {
  const companyLangCandidates = [
    company?.language,
    company?.preferred_language,
    company?.locale,
  ]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);
  const companyLang = companyLangCandidates.find((value) => value.startsWith("ar"));
  if (companyLang) return "ar";

  const bodyLang = String(req.body?.language || req.body?.lang || "").toLowerCase();
  const headerCompanyLang = String(req.headers["x-company-language"] || "").toLowerCase();
  const headerLang = String(req.headers["x-language"] || "").toLowerCase();
  const acceptLanguage = String(req.headers["accept-language"] || "").toLowerCase();
  const candidate = bodyLang || headerCompanyLang || headerLang || acceptLanguage;
  return candidate.startsWith("ar") ? "ar" : "en";
};

const buildCompanyApplicationNotificationTemplate = ({
  companyName,
  jobTitle,
  applicantName,
  cvPower,
  language = "en",
}) => {
  const safeCompanyName = String(companyName || "Team").trim();
  const safeApplicantName = String(applicantName || "A candidate").trim();
  const safeJobTitle = String(jobTitle || "your job post").trim();
  const applicationsUrl = getCompanyApplicationsUrl();
  const cvPowerLabel =
    typeof cvPower === "number" ? `${Math.round(cvPower)} / 100` : "Processing";
  const isArabic = language === "ar";

  if (isArabic) {
    const subject = "طلب توظيف جديد على Talents";
    const textBody =
      `مرحباً ${safeCompanyName}،\n\n` +
      `لديك طلب توظيف جديد على "${safeJobTitle}".\n\n` +
      `المرشح: ${safeApplicantName}\n` +
      `قوة السيرة: ${cvPowerLabel}\n\n` +
      "افتح صفحة الطلبات لمراجعة الملف، واستخدم الفلاتر وتوصيات وتحليلات الذكاء الاصطناعي لتكوين قائمة مختصرة دقيقة.\n\n" +
      `فتح صفحة الطلبات: ${applicationsUrl}\n\n` +
      "نتمنى لكم عملية توظيف ناجحة وسلسة.\n\n" +
      "فريق Talents";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;" dir="rtl">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
            <h2 style="margin:0; font-size:20px;">طلب توظيف جديد</h2>
            <p style="margin:6px 0 0; opacity:.9;">تنبيهات Talents</p>
          </div>
          <div style="padding:22px; color:#111827;">
            <p style="margin:0 0 12px;">مرحباً <strong>${safeCompanyName}</strong>،</p>
            <p style="margin:0 0 12px;">
              وصل مرشح جديد إلى <strong>${safeJobTitle}</strong>.
            </p>
            <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin:0 0 14px;">
              <p style="margin:0 0 6px;"><strong>المرشح:</strong> ${safeApplicantName}</p>
              <p style="margin:0;"><strong>قوة السيرة:</strong> ${cvPowerLabel}</p>
            </div>
            <p style="margin:0 0 14px; color:#374151;">
              افتح صفحة الطلبات لتصفية المرشحين والاعتماد على توصيات وتحليلات الذكاء الاصطناعي لاختيار المرشح الأنسب بسرعة.
            </p>
            <p style="margin:0 0 14px;">
              <a href="${applicationsUrl}" style="display:inline-block; background:#111827; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600;">
                فتح صفحة الطلبات
              </a>
            </p>
            <p style="margin:0; color:#6b7280;">نتمنى لكم عملية توظيف ناجحة وسلسة.</p>
            <p style="margin:14px 0 0; color:#111827;">فريق Talents</p>
          </div>
        </div>
      </div>
    `;

    return { subject, textBody, htmlBody };
  }

  const subject = "New application received on Talents";
  const textBody =
    `Hello ${safeCompanyName},\n\n` +
    `You received a new application for "${safeJobTitle}".\n\n` +
    `Candidate: ${safeApplicantName}\n` +
    `CV Power: ${cvPowerLabel}\n\n` +
    "Open your Applications page to review this profile, use filters, and check AI recommendations and insights before making your shortlist.\n\n" +
    `Open Applications: ${applicationsUrl}\n\n` +
    "Wishing you a smooth and successful hiring process.\n\n" +
    "Talents Team";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
          <h2 style="margin:0; font-size:20px;">New Application Received</h2>
          <p style="margin:6px 0 0; opacity:.9;">Talents Hiring Alerts</p>
        </div>
        <div style="padding:22px; color:#111827;">
          <p style="margin:0 0 12px;">Hello <strong>${safeCompanyName}</strong>,</p>
          <p style="margin:0 0 12px;">
            A new candidate applied to <strong>${safeJobTitle}</strong>.
          </p>
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin:0 0 14px;">
            <p style="margin:0 0 6px;"><strong>Candidate:</strong> ${safeApplicantName}</p>
            <p style="margin:0;"><strong>CV Power:</strong> ${cvPowerLabel}</p>
          </div>
          <p style="margin:0 0 14px; color:#374151;">
            Open your Applications page to filter profiles and use AI recommendations and insights to choose the right candidate faster.
          </p>
          <p style="margin:0 0 14px;">
            <a href="${applicationsUrl}" style="display:inline-block; background:#111827; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600;">
              Open Applications Page
            </a>
          </p>
          <p style="margin:0; color:#6b7280;">Wishing you a smooth and successful hiring process.</p>
          <p style="margin:14px 0 0; color:#111827;">Talents Team</p>
        </div>
      </div>
    </div>
  `;

  return { subject, textBody, htmlBody };
};

const resolveLanguage = (req) => {
  const bodyLang = String(req.body?.language || req.body?.lang || "").toLowerCase();
  const headerLang = String(req.headers["x-language"] || "").toLowerCase();
  const acceptLanguage = String(req.headers["accept-language"] || "").toLowerCase();
  const candidate = bodyLang || headerLang || acceptLanguage;
  return candidate.startsWith("ar") ? "ar" : "en";
};

const buildUserRegistrationOtpTemplate = ({ name, otpCode, language = "en" }) => {
  const safeName = String(name || "there").trim();
  const isArabic = language === "ar";
  if (isArabic) {
    return {
      subject: "رمز التحقق لتسجيل حسابك - Talents",
      text:
        `مرحباً ${safeName}،\n\n` +
        "استخدم رمز التحقق التالي لإكمال إنشاء حسابك:\n" +
        `${otpCode}\n\n` +
        `صلاحية الرمز: ${USER_REG_OTP_EXPIRES_MINUTES} دقيقة.\n` +
        "إذا لم تطلب التسجيل، تجاهل هذه الرسالة.\n\n" +
        "فريق Talents",
      html: `
        <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;" dir="rtl">
          <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:14px;">
            <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
              <h2 style="margin:0; font-size:20px;">Talents</h2>
              <p style="margin:6px 0 0; opacity:.9;">التحقق من البريد الإلكتروني</p>
            </div>
            <div style="padding:22px; color:#111827;">
              <p style="margin:0 0 12px;">مرحباً <strong>${safeName}</strong>،</p>
              <p style="margin:0 0 16px;">استخدم الرمز التالي لإكمال التسجيل:</p>
              <div style="background:#f9fafb; border:1px dashed #d1d5db; border-radius:12px; padding:16px; text-align:center;">
                <div style="font-size:32px; font-weight:700; letter-spacing:6px; color:#111827;">${otpCode}</div>
              </div>
              <p style="margin:16px 0 0; color:#374151;">صلاحية الرمز: <strong>${USER_REG_OTP_EXPIRES_MINUTES} دقيقة</strong>.</p>
            </div>
          </div>
        </div>
      `,
    };
  }

  return {
    subject: "Verification code for your account registration - Talents",
    text:
      `Hello ${safeName},\n\n` +
      "Use the following OTP code to complete your account registration:\n" +
      `${otpCode}\n\n` +
      `This code expires in ${USER_REG_OTP_EXPIRES_MINUTES} minutes.\n` +
      "If this wasn't you, please ignore this email.\n\n" +
      "Talents Team",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:14px;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
            <h2 style="margin:0; font-size:20px;">Talents</h2>
            <p style="margin:6px 0 0; opacity:.9;">Email Verification</p>
          </div>
          <div style="padding:22px; color:#111827;">
            <p style="margin:0 0 12px;">Hello <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 16px;">Use this OTP code to complete your registration:</p>
            <div style="background:#f9fafb; border:1px dashed #d1d5db; border-radius:12px; padding:16px; text-align:center;">
              <div style="font-size:32px; font-weight:700; letter-spacing:6px; color:#111827;">${otpCode}</div>
            </div>
            <p style="margin:16px 0 0; color:#374151;">This code expires in <strong>${USER_REG_OTP_EXPIRES_MINUTES} minutes</strong>.</p>
          </div>
        </div>
      </div>
    `,
  };
};

const buildAccountDeleteOtpTemplate = ({ name, otpCode, language = "en" }) => {
  const safeName = String(name || "there").trim();
  if (language === "ar") {
    return {
      subject: "تأكيد حذف الحساب - Talents",
      text:
        `مرحباً ${safeName}،\n\n` +
        "وصلنا طلب حذف حسابك.\n" +
        "أدخل رمز التحقق التالي لتأكيد الحذف:\n" +
        `${otpCode}\n\n` +
        `صلاحية الرمز: ${ACCOUNT_DELETE_OTP_EXPIRES_MINUTES} دقيقة.\n` +
        "بعد التأكيد، سيتم تعطيل الحساب فوراً وحذفه نهائياً بعد 30 يوماً.\n\n" +
        "فريق Talents",
    };
  }

  return {
    subject: "Confirm account deletion - Talents",
    text:
      `Hello ${safeName},\n\n` +
      "We received a request to delete your account.\n" +
      "Use this OTP to confirm deletion:\n" +
      `${otpCode}\n\n` +
      `This code expires in ${ACCOUNT_DELETE_OTP_EXPIRES_MINUTES} minutes.\n` +
      "After confirmation, your account is blocked immediately and permanently purged after 30 days.\n\n" +
      "Talents Team",
  };
};

const createDeletedUserEmail = (userId) => `deleted_user_${userId}_${Date.now()}@deleted.local`;

exports.sendContactMessage = async (req, res) => {
  try {
    const subjectInput = String(req.body?.subject || "").trim();
    const messageInput = String(req.body?.message || "").trim();
    const language = resolveLanguage(req);
    const requesterUserId = Number(req.user?.user_id) || null;
    let requesterEmail = String(req.body?.email || req.user?.email || "")
      .trim()
      .toLowerCase();
    let requesterName = String(req.body?.full_name || req.user?.full_name || "")
      .trim();

    if (!subjectInput || !messageInput) {
      return errorResponse(res, "Subject and message are required.", null, 400);
    }
    if (subjectInput.length > 180) {
      return errorResponse(res, "Subject is too long.", null, 400);
    }
    if (messageInput.length > 5000) {
      return errorResponse(res, "Message is too long.", null, 400);
    }

    const requesterKey = requesterUserId
      ? `user:${requesterUserId}`
      : `ip:${req.ip || "unknown"}`;
    const lastSentAt = contactRateLimitMap.get(requesterKey) || 0;
    const now = Date.now();
    if (now - lastSentAt < CONTACT_RATE_LIMIT_WINDOW_MS) {
      return errorResponse(
        res,
        "Please wait a moment before sending another message.",
        null,
        429
      );
    }

    if (requesterUserId) {
      try {
        const userRecord = await User.findByPk(requesterUserId, {
          attributes: ["user_id", "full_name", "email"],
        });
        if (userRecord) {
          requesterName = String(userRecord.full_name || requesterName || "").trim();
          requesterEmail = String(userRecord.email || requesterEmail || "")
            .trim()
            .toLowerCase();
        }
      } catch (lookupError) {
        console.warn("Contact sender lookup failed:", lookupError?.message || lookupError);
      }
    }

    const safeSubject = subjectInput.replace(/\r?\n/g, " ").trim();
    const introEn = "New Contact Us message from Talents platform";
    const introAr = "New Contact Us message from Talents platform";
    const senderLabel = requesterName
      ? `${requesterName}${requesterEmail ? ` <${requesterEmail}>` : ""}`
      : requesterEmail || "Unknown";
    const clientMeta = `${req.ip || "unknown"} | ${req.get("user-agent") || "unknown agent"}`;
    const userIdMeta = requesterUserId || "n/a";

    const textBody =
      `${language === "ar" ? introAr : introEn}\n\n` +
      `Sender: ${senderLabel}\n` +
      `User ID: ${userIdMeta}\n` +
      `Email: ${requesterEmail || "n/a"}\n` +
      `Subject: ${safeSubject}\n` +
      `Client: ${clientMeta}\n\n` +
      `Message:\n${messageInput}`;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:20px;" ${
        language === "ar" ? 'dir="rtl"' : ""
      }>
        <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
          <h2 style="margin:0 0 14px;color:#111827;">${
            language === "ar" ? introAr : introEn
          }</h2>
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin:0 0 14px;">
            <p style="margin:0 0 8px;"><strong>${
              "Sender"
            }:</strong> ${escapeHtml(senderLabel)}</p>
            <p style="margin:0 0 8px;"><strong>${
              "User ID"
            }:</strong> ${escapeHtml(String(userIdMeta))}</p>
            <p style="margin:0 0 8px;"><strong>${
              "Email"
            }:</strong> ${escapeHtml(requesterEmail || "n/a")}</p>
            <p style="margin:0 0 8px;"><strong>${
              "Subject"
            }:</strong> ${escapeHtml(safeSubject)}</p>
            <p style="margin:0;"><strong>${
              "Client"
            }:</strong> ${escapeHtml(clientMeta)}</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#f9fafb;white-space:pre-wrap;line-height:1.6;">
            ${escapeHtml(String(messageInput))}
          </div>
        </div>
      </div>
    `;

    await sendEmail(CONTACT_EMAIL_TO, `[Talents Contact] ${safeSubject}`, textBody, {
      html: htmlBody,
    });

    contactRateLimitMap.set(requesterKey, now);
    return successResponse(res, { sent: true, to: CONTACT_EMAIL_TO }, "Message sent.");
  } catch (error) {
    console.error("Contact message send error:", error);
    return errorResponse(res, "Failed to send contact message.", error, 500);
  }
};

exports.sendJobSeekerRegistrationOtp = async (req, res) => {
  try {
    const { email, full_name } = req.body || {};
    if (!email) {
      return errorResponse(res, "Email is required.", null, 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const language = resolveLanguage(req);

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return errorResponse(res, "Email is already registered.", null, 409);
    }

    const latestOtp = await UserEmailOtp.findOne({
      where: { email: normalizedEmail, purpose: "registration", consumed_at: null },
      order: [["created_at", "DESC"]],
    });
    if (latestOtp) {
      const cooldownUntil =
        latestOtp.created_at.getTime() + USER_REG_OTP_COOLDOWN_SECONDS * 1000;
      if (Date.now() < cooldownUntil) {
        return errorResponse(
          res,
          `Please wait ${USER_REG_OTP_COOLDOWN_SECONDS} seconds before requesting another OTP.`,
          null,
          429
        );
      }
    }

    const otpCode = generateOtpCode();
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + USER_REG_OTP_EXPIRES_MINUTES * 60 * 1000);

    await UserEmailOtp.create({
      email: normalizedEmail,
      purpose: "registration",
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      created_by_ip: req.ip,
      user_agent: req.get("user-agent") || null,
    });

    const { subject, text, html } = buildUserRegistrationOtpTemplate({
      name: full_name || normalizedEmail.split("@")[0],
      otpCode,
      language,
    });
    await sendEmail(normalizedEmail, subject, text, { html });

    return successResponse(
      res,
      { email: normalizedEmail, expires_in_minutes: USER_REG_OTP_EXPIRES_MINUTES },
      "Verification OTP sent."
    );
  } catch (error) {
    console.error("Send registration OTP error:", error);
    return errorResponse(res, "Failed to send registration OTP.", error, 500);
  }
};

exports.verifyJobSeekerRegistrationOtp = async (req, res) => {
  try {
    const { email, otp, code } = req.body || {};
    if (!email || (!otp && !code)) {
      return errorResponse(res, "Email and OTP code are required.", null, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const providedOtp = String(otp || code).trim();

    const otpRecord = await UserEmailOtp.findOne({
      where: { email: normalizedEmail, purpose: "registration", consumed_at: null },
      order: [["created_at", "DESC"]],
    });

    if (!otpRecord) {
      return errorResponse(res, "No OTP request found for this email.", null, 400);
    }
    if (otpRecord.verified_at) {
      return successResponse(res, { verified: true }, "Email already verified.");
    }
    if (otpRecord.expires_at < new Date()) {
      return errorResponse(res, "OTP expired. Please request a new code.", null, 400);
    }
    if (otpRecord.attempts >= USER_REG_OTP_MAX_ATTEMPTS) {
      return errorResponse(
        res,
        "Too many invalid attempts. Please request a new OTP.",
        null,
        429
      );
    }

    const hashedToken = crypto.createHash("sha256").update(providedOtp).digest("hex");
    if (hashedToken !== otpRecord.otp_hash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return errorResponse(res, "Invalid OTP code.", null, 400);
    }

    otpRecord.verified_at = new Date();
    await otpRecord.save();

    return successResponse(
      res,
      { verified: true, email: normalizedEmail },
      "Email verified successfully."
    );
  } catch (error) {
    console.error("Verify registration OTP error:", error);
    return errorResponse(res, "Failed to verify registration OTP.", error, 500);
  }
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
    if (user.is_deleted || user.is_active === false) {
      return errorResponse(res, "Account deleted or inactive.", null, 403);
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
    const normalizedEmail = String(email || "").trim().toLowerCase();
    let existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      await t.rollback();
      return errorResponse(res, "المستخدم مسجل مسبقاً.", null, 400);
    }

    // 2. تشفير كلمة المرور
    const verifiedOtp = await UserEmailOtp.findOne({
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
      await t.rollback();
      return errorResponse(
        res,
        "Please verify your email with OTP before registration.",
        null,
        400
      );
    }

    const hashed_password = await bcrypt.hash(password, 10);

    // 3. إنشاء السجل في جدول المستخدمين العام (User)
    const user = await User.create(
      {
        full_name,
        email: normalizedEmail,
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
          email: normalizedEmail,
          hashed_password,
          phone, // ربط السجل بالمستخدم الذي أنشئ للتو
          // أضف أي حقول إضافية خاصة بالأدمن هنا
        },
        { transaction: t }
      );
    }

    // تأكيد العملية وحفظ البيانات نهائياً
    await t.commit();
    verifiedOtp.consumed_at = new Date();
    await verifiedOtp.save();

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
    const normalizedEmail = String(email).trim().toLowerCase();

    const genericMsg = "If the email is registered, an OTP reset code has been sent.";
    const user = await User.findOne({ where: { email: normalizedEmail } });

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

    await sendEmail(normalizedEmail, subject, text);

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
  const normalizedEmail = String(email || "").trim().toLowerCase();

  try {
    if (!normalizedEmail || !providedToken || !providedNewPassword) {
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
        email: normalizedEmail,
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

exports.requestDeleteAccount = async (req, res) => {
  try {
    const userId = Number(req.user?.user_id);
    const { current_password, reason } = req.body || {};
    if (!userId) {
      return errorResponse(res, "Unauthorized.", null, 401);
    }
    if (!current_password) {
      return errorResponse(res, "Current password is required.", null, 400);
    }

    const user = await User.findByPk(userId);
    if (!user || user.is_deleted) {
      return errorResponse(res, "Account deleted.", null, 404);
    }

    const isMatch = await bcrypt.compare(String(current_password), user.hashed_password);
    if (!isMatch) {
      return errorResponse(res, "Current password is incorrect.", null, 401);
    }

    const otpCode = generateOtpCode();
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + ACCOUNT_DELETE_OTP_EXPIRES_MINUTES * 60 * 1000);
    const language = resolveLanguage(req);

    await UserEmailOtp.create({
      email: String(user.email).toLowerCase(),
      purpose: "account_delete",
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      created_by_ip: req.ip,
      user_agent: req.get("user-agent") || null,
    });

    const template = buildAccountDeleteOtpTemplate({
      name: user.full_name,
      otpCode,
      language,
    });
    await sendEmail(user.email, template.subject, template.text);

    user.deletion_requested_at = new Date();
    user.deletion_reason = reason ? String(reason).slice(0, 500) : null;
    await user.save();

    return successResponse(
      res,
      { expires_in_minutes: ACCOUNT_DELETE_OTP_EXPIRES_MINUTES },
      "Deletion OTP sent."
    );
  } catch (error) {
    console.error("Request delete account error:", error);
    return errorResponse(res, "Failed to request account deletion.", error, 500);
  }
};

exports.confirmDeleteAccount = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = Number(req.user?.user_id);
    const otp = String(req.body?.otp || "").trim();
    if (!userId) {
      await t.rollback();
      return errorResponse(res, "Unauthorized.", null, 401);
    }
    if (!otp) {
      await t.rollback();
      return errorResponse(res, "OTP is required.", null, 400);
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user || user.is_deleted) {
      await t.rollback();
      return errorResponse(res, "Account deleted.", null, 404);
    }

    const otpRecord = await UserEmailOtp.findOne({
      where: {
        email: String(user.email).toLowerCase(),
        purpose: "account_delete",
        consumed_at: null,
      },
      order: [["created_at", "DESC"]],
      transaction: t,
    });

    if (!otpRecord) {
      await t.rollback();
      return errorResponse(res, "No deletion OTP request found.", null, 400);
    }
    if (otpRecord.expires_at < new Date()) {
      await t.rollback();
      return errorResponse(res, "OTP expired. Request a new code.", null, 400);
    }
    if (otpRecord.attempts >= ACCOUNT_DELETE_OTP_MAX_ATTEMPTS) {
      await t.rollback();
      return errorResponse(res, "Too many invalid attempts.", null, 429);
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (otpHash !== otpRecord.otp_hash) {
      otpRecord.attempts += 1;
      await otpRecord.save({ transaction: t });
      await t.commit();
      return errorResponse(res, "Invalid OTP code.", null, 400);
    }

    otpRecord.verified_at = new Date();
    otpRecord.consumed_at = new Date();
    await otpRecord.save({ transaction: t });

    user.is_deleted = true;
    user.deleted_at = new Date();
    user.deletion_requested_at = user.deletion_requested_at || new Date();
    user.full_name = "Deleted User";
    user.phone = null;
    user.fcm_token = null;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    user.reset_password_sent_at = null;
    user.email = createDeletedUserEmail(user.user_id);
    await user.save({ transaction: t });

    await t.commit();
    return successResponse(
      res,
      { deleted: true, logout_required: true },
      "Account deleted successfully."
    );
  } catch (error) {
    await t.rollback();
    console.error("Confirm delete account error:", error);
    return errorResponse(res, "Failed to delete account.", error, 500);
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
      where: { is_approved: true, is_deleted: false }, // approved and active only
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
      "is_anonymous",
      "created_at",
    ];

    const include = [
      {
        model: Company,
        attributes: ["company_id", "name", "logo_mimetype"],
        where: { is_deleted: false },
        required: true,
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
        if (data.Company) data.Company = maskCompanyIfAnonymous(data, data.Company);
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
      if (data.Company) data.Company = maskCompanyIfAnonymous(data, data.Company);
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
        "is_anonymous",
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
          where: { is_deleted: false },
          required: true,
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
      payload.Company = maskCompanyIfAnonymous(payload, payload.Company);
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
  const { job_id, cv_id, cover_letter, form_data } = req.body;
  const { user_id } = req.user;
  const uploadedFile = req.file;

  const t = await sequelize.transaction();
  try {
    const job = await JobPosting.findByPk(job_id, {
      include: [{ model: JobForm, attributes: ["form_id", "require_cv"], required: false }],
      transaction: t,
    });
    if (!job || job.status !== "open") {
      await t.rollback();
      return res.status(404).json({ message: "Job not found or closed." });
    }

    const existingApplication = await Application.findOne({
      where: { user_id, job_id },
      transaction: t,
    });
    if (existingApplication) {
      await t.rollback();
      return res.status(400).json({ message: "You already applied to this job." });
    }

    let finalCvId = cv_id || null;

    if (uploadedFile) {
      await t.rollback();
      return res.status(400).json({
        message: "Upload external CVs in CV Lab, run AI analysis, then apply using a CV from CV Lab.",
      });
    }

    if (!finalCvId) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "A CV from CV Lab is required for this application." });
    }

    if (finalCvId) {
      const userCv = await CV.findOne({
        where: { cv_id: finalCvId, user_id },
        transaction: t,
      });
      if (!userCv) {
        await t.rollback();
        return res.status(403).json({
          message: "Selected CV is invalid or does not belong to this user.",
        });
      }

      const analyzedCv = await CVFeaturesAnalytics.findOne({
        where: { cv_id: finalCvId },
        attributes: ["cv_id"],
        transaction: t,
      });
      if (!analyzedCv) {
        await t.rollback();
        return res.status(400).json({
          message: "Please run CV analysis in CV Lab before applying.",
        });
      }
    }

    const application = await Application.create(
      {
        user_id,
        job_id,
        cv_id: finalCvId,
        cover_letter: cover_letter || null,
        form_data: form_data ? JSON.parse(form_data) : null,
        status: "pending",
      },
      { transaction: t }
    );

    await t.commit();

    try {
      const [jobWithCompany, applicant, cvRecord] = await Promise.all([
        JobPosting.findByPk(job_id, {
          include: [{ model: Company, attributes: ["company_id", "name", "email"] }],
          attributes: ["job_id", "title", "company_id"],
        }),
        User.findByPk(user_id, { attributes: ["user_id", "full_name", "email"] }),
        finalCvId
          ? CV.findByPk(finalCvId, {
              include: [{ model: CVFeaturesAnalytics, attributes: ["ats_score"] }],
              attributes: ["cv_id"],
            })
          : Promise.resolve(null),
      ]);

      const company = jobWithCompany?.Company || null;
      const cvPowerRaw = cvRecord?.CVFeaturesAnalytics?.ats_score;
      const cvPower =
        typeof cvPowerRaw === "number" && Number.isFinite(cvPowerRaw)
          ? cvPowerRaw
          : null;

      if (company?.email) {
        const language = resolveCompanyNotificationLanguage(req, company);
        const { subject, textBody, htmlBody } = buildCompanyApplicationNotificationTemplate({
          companyName: company.name,
          jobTitle: jobWithCompany?.title,
          applicantName: applicant?.full_name || applicant?.email || "Candidate",
          cvPower,
          language,
        });
        await sendEmail(company.email, subject, textBody, { html: htmlBody });
      }
    } catch (emailError) {
      console.error("Company new-application email failed:", emailError);
    }

    return successResponse(
      res,
      { application_id: application.application_id },
      "Application submitted successfully.",
      201
    );
  } catch (error) {
    await t.rollback();
    console.error("Error submitting application:", error);
    return res
      .status(500)
      .json({ message: "Failed to submit application.", error: error.message });
  }
};

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
          attributes: ["job_id", "title", "status", "location", "is_anonymous"],
          include: [{ model: Company, attributes: ["name"] }],
        },
        {
          model: CV,
          attributes: ["cv_id", "title", "file_url"],  
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    const payload = applications.map((application) => {
      const data = application.toJSON ? application.toJSON() : { ...application };
      if (data.JobPosting?.Company) {
        data.JobPosting.Company = maskCompanyIfAnonymous(data.JobPosting, data.JobPosting.Company);
      }
      return data;
    });
    return successResponse(res, payload);
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




