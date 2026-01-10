// file: src/controllers/email.controller.js

const { EmailNotification, Company } = require("../models");
const sendEmailUtil = require("../utils/sendEmail");
const { successResponse } = require("../utils/responseHandler");

/**
 * Helper: detect createdAt field name (created_at vs createdAt)
 */
function getCreatedAtField(Model) {
  if (!Model || !Model.rawAttributes) return "createdAt";
  if (Model.rawAttributes.created_at) return "created_at";
  if (Model.rawAttributes.createdAt) return "createdAt";
  return "createdAt";
}

/**
 * @desc [Admin Only] إرسال بريد إلكتروني مخصص وتسجيله
 * @route POST /api/email/send/custom   (إذا بدك تستخدمه لازم تضيف راوت)
 * @access Admin
 */
exports.sendCustomEmail = async (req, res) => {
  const { recipient, subject, body, html } = req.body;
  const adminId = req.user?.user_id;

  if (!adminId) {
    return res.status(401).json({ message: "غير مصرح" });
  }

  if (!recipient || !subject || (!body && !html)) {
    return res
      .status(400)
      .json({ message: "المستلم، الموضوع، والنص إجباريون." });
  }

  let isSent = false;
  let sent_at = null;
  let status = "failed";
  let error_message = null;

  // 1) إرسال خارجي
  try {
    await sendEmailUtil(recipient, subject, body || "", { html });
    isSent = true;
    sent_at = new Date();
    status = "sent";
  } catch (err) {
    error_message = err.message;
  }

  // 2) تسجيل بقاعدة البيانات
  try {
    const emailRecord = await EmailNotification.create({
      sender_id: adminId,
      recipient_email: recipient,
      subject,
      body: body || "",
      status,
      sent_at,
      error_message,
    });

    const statusMessage = isSent
      ? "تم الإرسال والتسجيل بنجاح."
      : "فشل الإرسال الخارجي، تم التسجيل داخلياً بحالة 'failed'.";

    return successResponse(
      res,
      { email_id: emailRecord.id, is_sent: isSent },
      statusMessage
    );
  } catch (error) {
    console.error("Error creating email log:", error);
    return res.status(500).json({
      message: "فشل في عملية إرسال أو تسجيل البريد الإلكتروني.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc [Admin Only] إرسال بريد إلى شركة (باستخدام company_id أو recipient_email)
 * @route POST /api/email/send
 * @access Admin
 */
exports.sendEmailToCompany = async (req, res) => {
  const { target_company_id, recipient_email, subject, body, html } = req.body;
  const adminId = req.user?.user_id;

  if (!adminId) {
    return res.status(401).json({ message: "غير مصرح" });
  }

  if (!subject || (!body && !html)) {
    return res.status(400).json({ message: "الموضوع والنص إجباريون." });
  }

  let company = null;
  let finalRecipient = recipient_email;
  let status = "failed";
  let error_message = null;

  try {
    if (target_company_id) {
      company = await Company.findByPk(target_company_id);
      if (!company) {
        status = "failed_company_not_found";
        throw new Error("الشركة المستهدفة غير موجودة.");
      }
      finalRecipient = recipient_email || company.email;
    }

    if (!finalRecipient) {
      status = "failed_no_recipient";
      throw new Error("يجب تحديد بريد إلكتروني مستقبِل.");
    }

    // إرسال
    await sendEmailUtil(finalRecipient, subject, body || "", { html });
    status = "sent";

    // تسجيل نجاح
    const newEmail = await EmailNotification.create({
      sender_id: adminId,
      company_id: target_company_id || null,
      recipient_email: finalRecipient,
      subject,
      body: body || "",
      status,
      sent_at: new Date(),
      error_message: null,
    });

    return successResponse(
      res,
      { email_id: newEmail.id },
      `تم إرسال البريد الإلكتروني إلى ${finalRecipient} بنجاح.`
    );
  } catch (error) {
    console.error("فشل في إرسال البريد الإلكتروني:", error);
    error_message = error.message;

    // تسجيل فشل (حتى لو فشل قبل الإرسال)
    try {
      await EmailNotification.create({
        sender_id: adminId,
        company_id: target_company_id || null,
        recipient_email: finalRecipient || "UNKNOWN",
        subject: subject || "",
        body: body || "",
        status: status === "sent" ? "failed" : status,
        sent_at: status === "sent" ? new Date() : null,
        error_message,
      });
    } catch (logError) {
      console.error("فشل في تسجيل إخفاق الإيميل:", logError);
    }

    // أخطاء تحقق = 400، غيرها = 500
    const isValidation =
      status === "failed_no_recipient" || status === "failed_company_not_found";

    return res.status(isValidation ? 400 : 500).json({
      message: "فشل في عملية إرسال البريد الإلكتروني.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      status,
    });
  }
};

/**
 * @desc [Admin Only] عرض سجلات الإيميلات
 * @route GET /api/email
 * @access Admin
 */
exports.listSentEmails = async (req, res) => {
  try {
    const createdAtField = getCreatedAtField(EmailNotification);

    const emails = await EmailNotification.findAll({
      order: [[createdAtField, "DESC"]],
      limit: 50,
      include: Company
        ? [
            {
              model: Company,
              attributes: ["company_id", "name", "email"],
              required: false,
            },
          ]
        : [],
    });

    return successResponse(res, emails);
  } catch (error) {
    console.error("فشل في جلب سجلات الإيميلات:", error);
    return res.status(500).json({ message: "فشل في جلب السجلات." });
  }
};
