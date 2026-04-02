const { Company, CompanyUser, CompanyRefreshToken, CompanyEmailOtp, JobPosting } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize"); // أضف هذا الاستيراد
const { successResponse, errorResponse } = require("../utils/responseHandler");
const sendEmail = require("../utils/sendEmail");
const { MailerError } = require("../utils/mailer");

const ACCESS_TOKEN_TTL_MINUTES = parseInt(
  process.env.COMPANY_ACCESS_TOKEN_TTL_MINUTES || "15",
  10
);
const REFRESH_TOKEN_TTL_DAYS = parseInt(
  process.env.COMPANY_REFRESH_TOKEN_TTL_DAYS || "14",
  10
);
const ACCESS_TOKEN_TTL = `${ACCESS_TOKEN_TTL_MINUTES}m`;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
const RESET_PASSWORD_OTP_EXPIRES_MINUTES = parseInt(
  process.env.COMPANY_RESET_PASSWORD_OTP_EXPIRES_MINUTES || "15",
  10
);
const ACCOUNT_DELETE_OTP_EXPIRES_MINUTES = parseInt(
  process.env.COMPANY_ACCOUNT_DELETE_OTP_EXPIRES_MINUTES || "10",
  10
);
const ACCOUNT_DELETE_OTP_MAX_ATTEMPTS = parseInt(
  process.env.COMPANY_ACCOUNT_DELETE_OTP_MAX_ATTEMPTS || "5",
  10
);
const IS_PROD = process.env.NODE_ENV === "production";
const RESET_OTP_USER_AGENT = "__company_password_reset_otp__";

const accessCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax",
  maxAge: ACCESS_TOKEN_TTL_MS,
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax",
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/api/companies",
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const extractMissingColumn = (error) => {
  const raw = String(error?.parent?.sqlMessage || error?.message || "");
  const mysqlMatch = raw.match(/Unknown column '([^']+)'/i);
  if (mysqlMatch?.[1]) return mysqlMatch[1];
  const pgMatch = raw.match(/column "([^"]+)" does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
};

const createRefreshTokenRecordCompat = async (payload) => {
  const recordPayload = { ...payload };

  while (true) {
    try {
      return await CompanyRefreshToken.create(recordPayload);
    } catch (error) {
      const missingColumn = extractMissingColumn(error);
      if (
        missingColumn &&
        Object.prototype.hasOwnProperty.call(recordPayload, missingColumn)
      ) {
        delete recordPayload[missingColumn];
        continue;
      }
      throw error;
    }
  }
};

const issueAccessToken = (companyId, email) =>
  jwt.sign(
    {
      company_id: companyId,
      role: "company",
      email,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

const createRefreshToken = async (companyId, loginEmail, req) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await createRefreshTokenRecordCompat({
    company_id: companyId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by_ip: req.ip,
    user_agent: req.get("user-agent") || null,
    login_email: loginEmail || null,
  });

  return { refreshToken, tokenHash, expiresAt };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("company_access", accessToken, accessCookieOptions);
  res.cookie("company_refresh", refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
  res.clearCookie("company_access", accessCookieOptions);
  res.clearCookie("company_refresh", refreshCookieOptions);
};

const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));
const generateUniqueTokenHash = () =>
  hashToken(crypto.randomBytes(64).toString("hex"));

const findCompanyByLoginEmail = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const companyUser = await CompanyUser.findOne({ where: { email: normalizedEmail } });
  if (companyUser) {
    const company = await Company.findByPk(companyUser.company_id);
    return { normalizedEmail, company, companyUser };
  }
  const company = await Company.findOne({ where: { email: normalizedEmail } });
  return { normalizedEmail, company, companyUser: null };
};

const resolveLanguage = (req) => {
  const bodyLang = String(req.body?.language || "").toLowerCase();
  const headerLang = String(req.headers["x-language"] || "").toLowerCase();
  const acceptLanguage = String(req.headers["accept-language"] || "").toLowerCase();
  const candidate = bodyLang || headerLang || acceptLanguage;
  return candidate.startsWith("ar") ? "ar" : "en";
};

const resolveCompanyLanguage = (req, company) => {
  const companyLang = String(
    company?.preferred_language || company?.language || company?.locale || ""
  ).toLowerCase();
  if (companyLang.startsWith("ar")) return "ar";
  if (companyLang.startsWith("en")) return "en";
  return resolveLanguage(req);
};

const buildCompanyOtpTemplate = ({
  language,
  companyName,
  otpCode,
  expiresMinutes,
}) => {
  const safeName = companyName || "Team";
  const isAr = language === "ar";

  if (isAr) {
    return {
      subject: "رمز إعادة تعيين كلمة المرور - Talents We Trust",
      text:
        `مرحباً ${safeName}\n\n` +
        "وصلنا طلب لإعادة تعيين كلمة المرور لحساب الشركة.\n" +
        `رمز التحقق (OTP): ${otpCode}\n` +
        `صلاحية الرمز: ${expiresMinutes} دقيقة.\n\n` +
        "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.",
      html: `
        <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;" dir="rtl">
          <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
              <h2 style="margin:0; font-size:20px;">Talents We Trust</h2>
              <p style="margin:6px 0 0; opacity:.9;">إعادة تعيين كلمة المرور</p>
            </div>
            <div style="padding:22px; color:#111827;">
              <p style="margin:0 0 12px;">مرحباً ${safeName}،</p>
              <p style="margin:0 0 16px;">وصلنا طلب لإعادة تعيين كلمة المرور لحساب الشركة.</p>
              <div style="background:#f9fafb; border:1px dashed #d1d5db; border-radius:12px; padding:16px; text-align:center; margin:0 0 16px;">
                <div style="font-size:13px; color:#6b7280; margin-bottom:8px;">رمز التحقق (OTP)</div>
                <div style="font-size:32px; font-weight:700; letter-spacing:6px; color:#111827;">${otpCode}</div>
              </div>
              <p style="margin:0 0 16px; color:#374151;">صلاحية الرمز: <strong>${expiresMinutes} دقيقة</strong>.</p>
              <p style="margin:0; color:#6b7280;">إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p>
            </div>
          </div>
        </div>
      `,
    };
  }

  return {
    subject: "Password Reset OTP - Talents We Trust",
    text:
      `Hello ${safeName},\n\n` +
      "We received a password reset request for your company account.\n" +
      `Your OTP code is: ${otpCode}\n` +
      `This OTP expires in ${expiresMinutes} minutes.\n\n` +
      "If you did not request this, please ignore this email.",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f4f7fb; padding:24px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937); color:#fff; padding:18px 22px;">
            <h2 style="margin:0; font-size:20px;">Talents We Trust</h2>
            <p style="margin:6px 0 0; opacity:.9;">Password Reset</p>
          </div>
          <div style="padding:22px; color:#111827;">
            <p style="margin:0 0 12px;">Hello ${safeName},</p>
            <p style="margin:0 0 16px;">We received a password reset request for your company account.</p>
            <div style="background:#f9fafb; border:1px dashed #d1d5db; border-radius:12px; padding:16px; text-align:center; margin:0 0 16px;">
              <div style="font-size:13px; color:#6b7280; margin-bottom:8px;">OTP Code</div>
              <div style="font-size:32px; font-weight:700; letter-spacing:6px; color:#111827;">${otpCode}</div>
            </div>
            <p style="margin:0 0 16px; color:#374151;">This OTP expires in <strong>${expiresMinutes} minutes</strong>.</p>
            <p style="margin:0; color:#6b7280;">If you did not request this, please ignore this email.</p>
          </div>
        </div>
      </div>
    `,
  };
};

const buildCompanyDeleteOtpTemplate = ({ language, companyName, otpCode }) => {
  const safeName = companyName || "Team";
  if (language === "ar") {
    return {
      subject: "تأكيد حذف الحساب - Talents",
      text:
        `مرحباً ${safeName}\n\n` +
        "وصلنا طلب حذف حساب الشركة.\n" +
        `رمز التحقق: ${otpCode}\n` +
        `صلاحية الرمز: ${ACCOUNT_DELETE_OTP_EXPIRES_MINUTES} دقيقة.\n` +
        "بعد التأكيد سيتم إيقاف الحساب فوراً وحذفه نهائياً بعد 30 يوماً.",
    };
  }

  return {
    subject: "Confirm account deletion - Talents",
    text:
      `Hello ${safeName},\n\n` +
      "We received a request to delete your company account.\n" +
      `OTP code: ${otpCode}\n` +
      `This code expires in ${ACCOUNT_DELETE_OTP_EXPIRES_MINUTES} minutes.\n` +
      "After confirmation, the account is blocked immediately and permanently purged after 30 days.",
  };
};

const createDeletedCompanyEmail = (companyId) =>
  `deleted_company_${companyId}_${Date.now()}@deleted.local`;

/**
 * @desc [Public] تسجيل دخول الشركة
 * @route POST /api/companies/login
 * @access Public
 */
exports.forgotCompanyPassword = async (req, res) => {
  let createdResetToken = null;
  try {
    const { email } = req.body || {};
    if (!email) {
      return errorResponse(res, "Email is required.", null, 400);
    }

    const genericMessage = "If this email is registered, an OTP code has been sent.";
    const { normalizedEmail, company, companyUser } = await findCompanyByLoginEmail(email);
    if (!company) {
      return successResponse(res, null, genericMessage);
    }
    if (company.is_deleted) {
      return successResponse(res, null, genericMessage);
    }
    if (companyUser && companyUser.is_active === false) {
      return successResponse(res, null, genericMessage);
    }
    const language = resolveCompanyLanguage(req, company);

    const otpCode = generateOtpCode();
    const otpHash = hashToken(otpCode);
    const expiresAt = new Date(
      Date.now() + RESET_PASSWORD_OTP_EXPIRES_MINUTES * 60 * 1000
    );

    await CompanyRefreshToken.update(
      { revoked_at: new Date() },
      {
        where: {
          login_email: normalizedEmail,
          user_agent: RESET_OTP_USER_AGENT,
          revoked_at: null,
        },
      }
    );

    createdResetToken = await CompanyRefreshToken.create({
      company_id: company.company_id,
      token_hash: generateUniqueTokenHash(),
      login_email: normalizedEmail,
      expires_at: expiresAt,
      created_by_ip: req.ip,
      user_agent: RESET_OTP_USER_AGENT,
      replaced_by_token_hash: otpHash,
    });

    const { subject, text, html } = buildCompanyOtpTemplate({
      language,
      companyName: company.name,
      otpCode,
      expiresMinutes: RESET_PASSWORD_OTP_EXPIRES_MINUTES,
    });
    await sendEmail(normalizedEmail, subject, text, { html });

    return successResponse(res, null, genericMessage);
  } catch (error) {
    if (createdResetToken?.token_id) {
      try {
        await CompanyRefreshToken.destroy({
          where: { token_id: createdResetToken.token_id },
        });
      } catch (rollbackError) {
        console.error("Forgot company password rollback error:", rollbackError);
      }
    }
    console.error("Forgot company password error:", error);
    const message =
      error instanceof MailerError
        ? "Failed to send reset OTP email. Please try again."
        : "Failed to process forgot-password request.";
    return errorResponse(res, message, null, 500);
  }
};

exports.resetCompanyPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const otp = String(code || "").trim();
    const newPassword = String(password || "");

    if (!normalizedEmail || !otp || !newPassword) {
      return errorResponse(res, "Email, OTP code, and password are required.", null, 400);
    }
    if (newPassword.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters.", null, 400);
    }

    const otpHash = hashToken(otp);
    const otpRecord = await CompanyRefreshToken.findOne({
      where: {
        login_email: normalizedEmail,
        replaced_by_token_hash: otpHash,
        user_agent: RESET_OTP_USER_AGENT,
        revoked_at: null,
      },
    });

    if (!otpRecord) {
      return errorResponse(res, "Invalid OTP code or email.", null, 400);
    }
    if (otpRecord.expires_at < new Date()) {
      otpRecord.revoked_at = new Date();
      await otpRecord.save();
      return errorResponse(res, "OTP has expired. Please request a new one.", null, 400);
    }

    const company = await Company.findByPk(otpRecord.company_id);
    if (!company) {
      otpRecord.revoked_at = new Date();
      await otpRecord.save();
      return errorResponse(res, "Company not found.", null, 404);
    }
    if (company.is_deleted) {
      otpRecord.revoked_at = new Date();
      await otpRecord.save();
      return errorResponse(res, "Account deleted.", null, 403);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const companyUser = await CompanyUser.findOne({
      where: { email: normalizedEmail, company_id: company.company_id },
    });

    if (companyUser && companyUser.is_active === false) {
      return errorResponse(res, "This account is inactive.", null, 403);
    }

    if (companyUser) {
      await companyUser.update({ hashed_password: hashedPassword });
    }

    const isCompanyEmail = normalizedEmail === String(company.email || "").toLowerCase();
    if (isCompanyEmail || !companyUser) {
      await company.update({
        password: hashedPassword,
        password_set_at: new Date(),
      });
    }

    otpRecord.revoked_at = new Date();
    await otpRecord.save();

    return successResponse(res, null, "Password reset successfully.");
  } catch (error) {
    console.error("Reset company password error:", error);
    return errorResponse(res, "Failed to reset password.", null, 500);
  }
};

exports.loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(
        res,
        "البريد الإلكتروني وكلمة المرور مطلوبان",
        null,
        400
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let companyUser = await CompanyUser.findOne({ where: { email: normalizedEmail } });
    let company = null;
    let passwordToCheck = null;

    if (companyUser) {
      company = await Company.findByPk(companyUser.company_id);
      if (!company) {
        return errorResponse(res, "Invalid email or password.", null, 401);
      }
      if (!companyUser.is_active) {
        return errorResponse(res, "هذا الحساب غير مفعل.", null, 403);
      }
      passwordToCheck = companyUser.hashed_password;
    } else {
      company = await Company.findOne({ where: { email: normalizedEmail } });
      passwordToCheck = company?.password || null;
    }

    if (!company) {
      return errorResponse(
        res,
        "Invalid email or password.",
        null,
        401
      );
    }
    if (company.is_deleted) {
      return errorResponse(res, "Account deleted.", null, 403);
    }

    if (!passwordToCheck) {
      return errorResponse(
        res,
        "Password not set for this company account.",
        null,
        403
      );
    }

    const isMatch = await bcrypt.compare(password, passwordToCheck);
    if (!isMatch) {
      return errorResponse(res, "بيانات تسجيل الدخول غير صحيحة", null, 401);
    }

    const status = company.is_approved
      ? "approved"
      : company.rejected_at
      ? "rejected"
      : "pending";

    const accessToken = issueAccessToken(company.company_id, normalizedEmail);
    const { refreshToken } = await createRefreshToken(company.company_id, normalizedEmail, req);
    setAuthCookies(res, accessToken, refreshToken);

    return successResponse(
      res,
      {
        company: {
          company_id: company.company_id,
          name: company.name,
          email: normalizedEmail,
          status,
          is_approved: company.is_approved,
        },
      },
      "تم تسجيل دخول الشركة بنجاح"
    );
  } catch (error) {
    console.error("Company login error:", error);
    return errorResponse(res, "حدث خطأ أثناء تسجيل الدخول", error, 500);
  }
};

/**
 * @desc [Public] تعيين كلمة مرور الشركة (أول مرة)
 * @route POST /api/companies/set-password
 * @access Public
 */
exports.setCompanyPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return errorResponse(res, "التوكن وكلمة المرور مطلوبان", null, 400);
    }

    if (password.length < 6) {
      return errorResponse(
        res,
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        null,
        400
      );
    }

    const company = await Company.findOne({
      where: {
        set_password_token: token,
        set_password_expires: { [Op.gt]: new Date() },
      },
    });

    if (!company) {
      return errorResponse(res, "الرابط غير صالح أو منتهي الصلاحية", null, 400);
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // تحديث الشركة
    await company.update({
      password: hashedPassword,
      password_set_at: new Date(),
      set_password_token: null,
      set_password_expires: null,
    });

    return successResponse(
      res,
      null,
      "تم تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول."
    );
  } catch (error) {
    console.error("Error setting password:", error);
    return errorResponse(res, "حدث خطأ أثناء تعيين كلمة المرور", error, 500);
  }
};

/**
 * @desc [Private/Company] تغيير كلمة مرور الشركة
 * @route PUT /api/companies/change-password
 * @access Private (Company)
 */
exports.changeCompanyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const company = req.company;
    const loginEmail = req.user?.email;

    if (!currentPassword || !newPassword) {
      return errorResponse(
        res,
        "كلمة المرور الحالية والجديدة مطلوبتان",
        null,
        400
      );
    }

    // التحقق من كلمة المرور الحالية
    const currentHash = loginEmail
      ? (await CompanyUser.findOne({ where: { email: loginEmail } }))?.hashed_password
      : company.password;
    const isMatch = currentHash
      ? await bcrypt.compare(currentPassword, currentHash)
      : false;
    if (!isMatch) {
      return errorResponse(res, "كلمة المرور الحالية غير صحيحة", null, 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
        null,
        400
      );
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await company.update({
      password: hashedPassword,
      password_set_at: new Date(),
    });

    if (loginEmail) {
      await CompanyUser.update(
        { hashed_password: hashedPassword },
        { where: { email: loginEmail, company_id: company.company_id } }
      );
    }

    return successResponse(res, null, "تم تغيير كلمة المرور بنجاح");
  } catch (error) {
    console.error("Error changing password:", error);
    return errorResponse(res, "حدث خطأ أثناء تغيير كلمة المرور", error, 500);
  }
};

exports.requestDeleteCompanyAccount = async (req, res) => {
  try {
    const company = req.company;
    const { current_password, reason } = req.body || {};
    if (!company) {
      return errorResponse(res, "Unauthorized.", null, 401);
    }
    if (!current_password) {
      return errorResponse(res, "Current password is required.", null, 400);
    }
    if (company.is_deleted) {
      return errorResponse(res, "Account deleted.", null, 404);
    }

    const loginEmail = String(req.user?.email || "").toLowerCase();
    const loginUser = loginEmail
      ? await CompanyUser.findOne({
          where: { email: loginEmail, company_id: company.company_id },
        })
      : null;
    const passwordHash = loginUser?.hashed_password || company.password;

    if (!passwordHash) {
      return errorResponse(res, "Password not set for this company account.", null, 400);
    }

    const isMatch = await bcrypt.compare(String(current_password), passwordHash);
    if (!isMatch) {
      return errorResponse(res, "Current password is incorrect.", null, 401);
    }

    const otpCode = generateOtpCode();
    const otpHash = hashToken(otpCode);
    const expiresAt = new Date(Date.now() + ACCOUNT_DELETE_OTP_EXPIRES_MINUTES * 60 * 1000);
    const language = resolveCompanyLanguage(req, company);
    const email = String(company.email || "").toLowerCase();

    await CompanyEmailOtp.create({
      email,
      purpose: "account_delete",
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      created_by_ip: req.ip,
      user_agent: req.get("user-agent") || null,
    });

    const template = buildCompanyDeleteOtpTemplate({
      language,
      companyName: company.name,
      otpCode,
    });
    await sendEmail(email, template.subject, template.text);

    company.deletion_requested_at = new Date();
    company.deletion_reason = reason ? String(reason).slice(0, 500) : null;
    await company.save();

    return successResponse(
      res,
      { expires_in_minutes: ACCOUNT_DELETE_OTP_EXPIRES_MINUTES },
      "Deletion OTP sent."
    );
  } catch (error) {
    console.error("Request company deletion error:", error);
    return errorResponse(res, "Failed to request account deletion.", null, 500);
  }
};

exports.confirmDeleteCompanyAccount = async (req, res) => {
  try {
    const company = req.company;
    const otp = String(req.body?.otp || "").trim();
    if (!company) {
      return errorResponse(res, "Unauthorized.", null, 401);
    }
    if (!otp) {
      return errorResponse(res, "OTP code is required.", null, 400);
    }
    if (company.is_deleted) {
      clearAuthCookies(res);
      return errorResponse(res, "Account deleted.", null, 404);
    }

    const otpRecord = await CompanyEmailOtp.findOne({
      where: {
        email: String(company.email || "").toLowerCase(),
        purpose: "account_delete",
        consumed_at: null,
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpRecord) {
      return errorResponse(res, "No deletion OTP request found.", null, 400);
    }
    if (otpRecord.expires_at < new Date()) {
      return errorResponse(res, "OTP has expired. Please request a new one.", null, 400);
    }
    if (otpRecord.attempts >= ACCOUNT_DELETE_OTP_MAX_ATTEMPTS) {
      return errorResponse(res, "Too many invalid attempts.", null, 429);
    }

    const otpHash = hashToken(otp);
    if (otpHash !== otpRecord.otp_hash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return errorResponse(res, "Invalid OTP code.", null, 400);
    }

    otpRecord.verified_at = new Date();
    otpRecord.consumed_at = new Date();
    await otpRecord.save();

    await JobPosting.update(
      { status: "closed" },
      { where: { company_id: company.company_id } }
    );

    await CompanyRefreshToken.update(
      { revoked_at: new Date() },
      { where: { company_id: company.company_id, revoked_at: null } }
    );

    company.is_deleted = true;
    company.deleted_at = new Date();
    company.deletion_requested_at = company.deletion_requested_at || new Date();
    company.name = "Deleted Company";
    company.phone = null;
    company.description = null;
    company.email = createDeletedCompanyEmail(company.company_id);
    company.logo_data = null;
    company.logo_mimetype = null;
    company.license_doc_url = null;
    company.license_mimetype = null;
    company.is_approved = false;
    await company.save();

    clearAuthCookies(res);
    return successResponse(
      res,
      { deleted: true, logout_required: true },
      "Account deleted successfully."
    );
  } catch (error) {
    console.error("Confirm company deletion error:", error);
    return errorResponse(res, "Failed to delete account.", null, 500);
  }
};


/**
 * @desc [Private/Company] Refresh access token using refresh cookie
 * @route POST /api/companies/refresh
 * @access Private (cookie)
 */
exports.refreshCompanySession = async (req, res) => {
  try {
    const refreshToken = req.cookies?.company_refresh;
    if (!refreshToken) {
      clearAuthCookies(res);
      return errorResponse(res, "Session expired. Please login.", null, 401);
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await CompanyRefreshToken.findOne({
      attributes: ["token_id", "company_id", "token_hash", "expires_at", "revoked_at"],
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
    });

    if (!stored || stored.expires_at < new Date()) {
      if (stored && !stored.revoked_at) {
        stored.revoked_at = new Date();
        await stored.save();
      }
      clearAuthCookies(res);
      return errorResponse(res, "Session expired. Please login.", null, 401);
    }

    const company = await Company.findByPk(stored.company_id);
    if (!company) {
      clearAuthCookies(res);
      return errorResponse(res, "Company not found.", null, 404);
    }
    if (company.is_deleted) {
      stored.revoked_at = new Date();
      await stored.save();
      clearAuthCookies(res);
      return errorResponse(res, "Account deleted.", null, 401);
    }

    const accessToken = issueAccessToken(company.company_id, company.email);
    const { refreshToken: nextRefreshToken, tokenHash: nextTokenHash } =
      await createRefreshToken(company.company_id, company.email, req);

    stored.revoked_at = new Date();
    stored.replaced_by_token_hash = nextTokenHash;
    await stored.save();

    setAuthCookies(res, accessToken, nextRefreshToken);

    return successResponse(res, { company_id: company.company_id }, "Session refreshed.");
  } catch (error) {
    console.error("Refresh session error:", error);
    clearAuthCookies(res);
    return errorResponse(res, "Session refresh failed.", error, 500);
  }
};

/**
 * @desc [Private/Company] Logout and revoke refresh token
 * @route POST /api/companies/logout
 * @access Private (cookie)
 */
exports.logoutCompany = async (req, res) => {
  try {
    const refreshToken = req.cookies?.company_refresh;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const stored = await CompanyRefreshToken.findOne({
        attributes: ["token_id", "token_hash", "revoked_at"],
        where: { token_hash: tokenHash, revoked_at: null },
      });
      if (stored) {
        stored.revoked_at = new Date();
        await stored.save();
      }
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    clearAuthCookies(res);
  }

  return successResponse(res, null, "Logged out.");
};

/**
 * @desc [Private/Company] Get current session company
 * @route GET /api/companies/session
 * @access Private (cookie)
 */
exports.getCompanySession = async (req, res) => {
  try {
    const company = req.company;
    if (!company) {
      return errorResponse(res, "Unauthorized.", null, 401);
    }
    if (company.is_deleted) {
      clearAuthCookies(res);
      return errorResponse(res, "Account deleted.", null, 401);
    }

    const status = company.is_approved
      ? "approved"
      : company.rejected_at
      ? "rejected"
      : "pending";

    return successResponse(res, {
      company_id: company.company_id,
      name: company.name,
      email: company.email,
      status,
      is_approved: company.is_approved,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return errorResponse(res, "Failed to fetch session.", error, 500);
  }
};
