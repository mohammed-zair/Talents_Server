const { Company, CompanyUser, CompanyRefreshToken } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize"); // أضف هذا الاستيراد
const { successResponse, errorResponse } = require("../utils/responseHandler");

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
const IS_PROD = process.env.NODE_ENV === "production";

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

  await CompanyRefreshToken.create({
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

/**
 * @desc [Public] تسجيل دخول الشركة
 * @route POST /api/companies/login
 * @access Public
 */
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

    const accessToken = issueAccessToken(company.company_id, stored.login_email || company.email);
    const { refreshToken: nextRefreshToken, tokenHash: nextTokenHash } =
      await createRefreshToken(company.company_id, stored.login_email || company.email, req);

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
