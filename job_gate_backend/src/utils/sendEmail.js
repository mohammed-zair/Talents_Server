// file: src/utils/sendEmail.js
const nodemailer = require("nodemailer");

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  return String(value).toLowerCase() === "true";
}

const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = toBool(process.env.SMTP_SECURE, SMTP_PORT === 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true مع 465, false مع 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  // تحسينات للسيرفر (مهمّة)
  pool: toBool(process.env.SMTP_POOL, true),
  maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 5),
  maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),

  // TLS (مفيد مع بعض السيرفرات)
  requireTLS: toBool(process.env.SMTP_REQUIRE_TLS, true),

  // timeouts
  connectionTimeout: Number(process.env.SMTP_CONN_TIMEOUT || 10000),
  greetingTimeout: Number(process.env.SMTP_GREET_TIMEOUT || 10000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
});

/**
 * إرسال بريد
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {object} [options] - { html, replyTo, fromName, fromEmail }
 */
async function sendEmail(to, subject, text, options = {}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP env vars are missing (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  }

  if (!to) throw new Error("Recipient email is required.");
  if (!subject) throw new Error("Email subject is required.");
  if (!text && !options.html) throw new Error("Email body is required (text or html).");

  const fromName = options.fromName || process.env.SMTP_FROM_NAME || "Job Gate";
  const fromEmail = options.fromEmail || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || undefined,
      html: options.html || undefined,
      replyTo: options.replyTo || undefined,
    });

    // مفيد للتشخيص
    console.log(`✅ Email sent to: ${to} | messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Email send failed:", {
      to,
      subject,
      code: error.code,
      response: error.response,
      message: error.message,
    });
    // مهم: نخلي الكنترولر يلتقط الفشل
    throw error;
  }
}

module.exports = sendEmail;
 