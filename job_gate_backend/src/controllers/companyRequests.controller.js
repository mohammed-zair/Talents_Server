const { CompanyRequest, Company } = require("../models");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const sequelize = require("../config/db.config");
const { successResponse } = require("../utils/responseHandler");
const { FRONT_URL } = process.env;

/**
 * @desc [Public] تقديم طلب تسجيل شركة جديد
 * @route POST /api/company-requests
 * @access Public
 */
exports.createRequest = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      license_doc_url,
      description,
      logo_url,
    } = req.body;

    if (!name || !email || !license_doc_url) {
      return res.status(400).json({
        message: "الاسم، البريد الإلكتروني، ورابط الرخصة إجباريون.",
      });
    }

    const existingCompany = await Company.findOne({ where: { email } });
    if (existingCompany) {
      return res.status(400).json({
        message: "هذا البريد الإلكتروني مسجل بالفعل كشركة معتمدة.",
      });
    }

    const existingRequest = await CompanyRequest.findOne({
      where: { email, status: "pending" },
    });
    if (existingRequest) {
      return res.status(400).json({
        message: "هناك بالفعل طلب قيد المراجعة بهذا البريد الإلكتروني.",
      });
    }

    const requestToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const request = await CompanyRequest.create({
      name,
      email,
      phone,
      license_doc_url,
      description,
      logo_url,
      request_token: requestToken,
      token_expires_at: expiresAt,
    });

    return successResponse(
      res,
      {
        request_id: request.request_id,
        status: request.status,
        tracking_token: requestToken,
      },
      "تم إرسال طلب التسجيل بنجاح، سيتم مراجعته",
      201
    );
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "هذا البريد الإلكتروني موجود بالفعل كطلب سابق أو شركة.",
      });
    }
    console.error("Error creating company request:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الطلب",
      error: error.message,
    });
  }
};

/**
 * @desc [Public] تتبع حالة طلب تسجيل شركة
 * @route POST /api/company-requests/track
 * @access Public
 */
exports.trackRequestStatus = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        message: "البريد الإلكتروني والتوكن مطلوبان",
      });
    }

    const request = await CompanyRequest.findOne({
      where: {
        email,
        request_token: token,
      },
    });

    if (!request) {
      return res.status(404).json({
        message: "طلب غير موجود أو بيانات غير صحيحة",
      });
    }

    if (request.token_expires_at < new Date()) {
      return res.status(401).json({
        message: "انتهت صلاحية التوكن",
      });
    }

    return successResponse(res, {
      status: request.status,
      admin_review_notes: request.admin_review_notes,
    });
  } catch (error) {
    console.error("Error tracking request:", error);
    return res.status(500).json({
      message: "فشل في جلب حالة الطلب",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin] عرض جميع طلبات التسجيل
 * @route GET /api/company-requests
 * @access Private (Admin)
 */
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await CompanyRequest.findAll({
      order: [["createdAt", "DESC"]],
    });
    return successResponse(res, requests);
  } catch (error) {
    console.error("Error getting all requests:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الطلبات",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin] عرض تفاصيل طلب محدد
 * @route GET /api/company-requests/:id
 * @access Private (Admin)
 */
exports.getRequestById = async (req, res) => {
  try {
    const request = await CompanyRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    return successResponse(res, request);
  } catch (error) {
    console.error("Error getting request by ID:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الطلب",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin] الموافقة على طلب تسجيل شركة
 * @route PUT /api/company-requests/approve/:id
 * @access Private (Admin)
 */
exports.approveRequest = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const request = await CompanyRequest.findByPk(req.params.id, {
      transaction: t,
    });

    if (!request) {
      await t.rollback();
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    if (request.status !== "pending") {
      await t.rollback();
      return res.status(400).json({
        message: "تمت معالجة هذا الطلب مسبقاً.",
      });
    }

    // 1️⃣ توليد token لتعيين كلمة المرور
    const setPasswordToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة

    // 2️⃣ إنشاء الشركة بدون كلمة مرور (مؤقتاً)
    const newCompany = await Company.create(
      {
        name: request.name,
        email: request.email,
        phone: request.phone,
        license_doc_url: request.license_doc_url,
        logo_url: request.logo_url,
        description: request.description,
        set_password_token: setPasswordToken,
        set_password_expires: tokenExpires,
        is_approved: true,
      },
      { transaction: t }
    );

    // 3️⃣ تحديث الطلب
    request.status = "approved";
    request.approved_company_id = newCompany.company_id;
    await request.save({ transaction: t });

    await t.commit();

    // 4️⃣ إرسال الإيميل للشركة
    await sendEmail(
      request.email,
      "Job Gate - تفعيل حساب الشركة",
      `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>مرحباً ${request.name} 👋</h2>
        <p>تمت الموافقة على طلب تسجيل شركتك في <strong>Job Gate</strong>.</p>
        <p>لتفعيل حسابك، يرجى الضغط على الرابط أدناه لتعيين كلمة المرور:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONT_URL}/set-password?token=${setPasswordToken}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            تعيين كلمة المرور
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          ⏰ هذا الرابط صالح لمدة 24 ساعة فقط.<br>
          📧 إذا لم تطلب هذا الرابط، يرجى تجاهل هذا الإيميل.
        </p>
        
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          Job Gate - بوابة التوظيف المتكاملة
        </p>
      </div>
      `
    );

    // 5️⃣ إرجاع رسالة نجاح (بدون كلمة مرور)
    return successResponse(
      res,
      {
        company_id: newCompany.company_id,
        email: newCompany.email,
        message: "تم إرسال رابط التعيين إلى بريد الشركة",
      },
      "تمت الموافقة على الطلب وإرسال رابط التعيين"
    );

  } catch (error) {
    await t.rollback();
    console.error("Error approving request:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء الموافقة على الطلب",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin] رفض طلب تسجيل شركة
 * @route PUT /api/company-requests/reject/:id
 * @access Private (Admin)
 */
exports.rejectRequest = async (req, res) => {
  try {
    const request = await CompanyRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "تم معالجة هذا الطلب مسبقاً.",
      });
    }

    const { admin_review_notes } = req.body;
    if (!admin_review_notes) {
      return res.status(400).json({
        message: "ملاحظات المسؤول مطلوبة لرفض الطلب.",
      });
    }

    request.status = "rejected";
    request.admin_review_notes = admin_review_notes;
    await request.save();

    return successResponse(res, request, "تم رفض الطلب بنجاح");
  } catch (error) {
    console.error("Error rejecting request:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء رفض الطلب",
      error: error.message,
    });
  }
};
