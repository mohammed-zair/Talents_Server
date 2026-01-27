const { Company, CompanyUser } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize"); // أضف هذا الاستيراد
const { successResponse, errorResponse } = require("../utils/responseHandler");

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

    const token = jwt.sign(
      {
        company_id: company.company_id,
        role: "company",
        email: normalizedEmail,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return successResponse(
      res,
      {
        token,
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
