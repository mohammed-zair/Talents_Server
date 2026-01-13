// file: src/utils/sendEmail.js
const { sendEmail: sendgridSendEmail } = require("./mailer");

/**
 * Backward-compatible wrapper for legacy call sites.
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {object} [options] - { html }
 */
async function sendEmail(to, subject, text, options = {}) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is missing in environment variables.");
  }

  if (!to) throw new Error("Recipient email is required.");
  if (!subject) throw new Error("Email subject is required.");
  if (!text && !options.html) throw new Error("Email body is required (text or html).");

  return sendgridSendEmail({
    to,
    subject,
    text: text || undefined,
    html: options.html || undefined,
  });
}

module.exports = sendEmail;
