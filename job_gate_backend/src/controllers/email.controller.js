const { EmailNotification, Company } = require("../models");
const sendEmailUtil = require("../utils/sendEmail");
const { successResponse } = require("../utils/responseHandler");

function getCreatedAtField(Model) {
  if (!Model || !Model.rawAttributes) return "createdAt";
  if (Model.rawAttributes.created_at) return "created_at";
  if (Model.rawAttributes.createdAt) return "createdAt";
  return "createdAt";
}

function isValidationErrorMessage(message = "") {
  return [
    "Company not found.",
    "Recipient email is required.",
  ].includes(String(message));
}

exports.sendCustomEmail = async (req, res) => {
  const { recipient, subject, body, html } = req.body;
  const adminId = req.user?.user_id;

  if (!adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!recipient || !subject || (!body && !html)) {
    return res
      .status(400)
      .json({ message: "recipient, subject and body/html are required." });
  }

  let isSent = false;
  let sentAt = null;

  try {
    await sendEmailUtil(recipient, subject, body || "", { html });
    isSent = true;
    sentAt = new Date();
  } catch (err) {
    // Continue to logging even if mail provider fails.
    console.error("sendCustomEmail provider failed:", err.message);
  }

  try {
    const emailRecord = await EmailNotification.create({
      company_id: null,
      recipient_email: recipient,
      subject,
      body: body || "",
      status: isSent ? "sent" : "failed",
      sent_at: sentAt,
    });

    const statusMessage = isSent
      ? "Email sent and logged successfully."
      : "Provider send failed; email was logged as failed.";

    return successResponse(
      res,
      { email_id: emailRecord.email_id || emailRecord.id, is_sent: isSent },
      statusMessage
    );
  } catch (error) {
    console.error("sendCustomEmail logging failed:", error);
    return res.status(500).json({
      message: "Failed to send/log email.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.sendEmailToCompany = async (req, res) => {
  const { target_company_id, recipient_email, subject, body, html } = req.body;
  const adminId = req.user?.user_id;

  if (!adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!subject || (!body && !html)) {
    return res.status(400).json({ message: "subject and body/html are required." });
  }

  let finalRecipient = recipient_email || null;
  let isSent = false;

  try {
    if (target_company_id) {
      const company = await Company.findByPk(target_company_id);
      if (!company) {
        throw new Error("Company not found.");
      }
      finalRecipient = finalRecipient || company.email;
    }

    if (!finalRecipient) {
      throw new Error("Recipient email is required.");
    }

    await sendEmailUtil(finalRecipient, subject, body || "", { html });
    isSent = true;

    const row = await EmailNotification.create({
      company_id: target_company_id || null,
      recipient_email: finalRecipient,
      subject,
      body: body || "",
      status: "sent",
      sent_at: new Date(),
    });

    return successResponse(
      res,
      { email_id: row.email_id || row.id },
      `Email sent to ${finalRecipient}.`
    );
  } catch (error) {
    console.error("sendEmailToCompany failed:", error.message);

    try {
      await EmailNotification.create({
        company_id: target_company_id || null,
        recipient_email: finalRecipient || "UNKNOWN",
        subject: subject || "",
        body: body || "",
        status: "failed",
        sent_at: null,
      });
    } catch (logError) {
      console.error("sendEmailToCompany failed-log failed:", logError.message);
    }

    const statusCode = isValidationErrorMessage(error.message) ? 400 : 500;
    return res.status(statusCode).json({
      message: "Failed to send email.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      status: "failed",
    });
  }
};

exports.listSentEmails = async (req, res) => {
  try {
    const include = [
      {
        model: Company,
        attributes: ["company_id", "name", "email"],
        required: false,
      },
    ];

    const orderCandidates = [getCreatedAtField(EmailNotification), "sent_at", "email_id"];
    let emails = [];
    let queryError = null;

    for (const orderField of orderCandidates) {
      try {
        emails = await EmailNotification.findAll({
          order: [[orderField, "DESC"]],
          limit: 50,
          include,
        });
        queryError = null;
        break;
      } catch (err) {
        queryError = err;
      }
    }

    if (queryError) throw queryError;
    return successResponse(res, emails);
  } catch (error) {
    console.error("listSentEmails failed:", error);
    return res.status(500).json({ message: "Failed to load email logs." });
  }
};
