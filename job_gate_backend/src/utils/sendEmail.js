const { sendEmail: mailerSend } = require("./mailer");

async function sendEmail(to, subject, text, options = {}) {
  if (!to) throw new Error("Recipient email is required.");
  if (!subject) throw new Error("Email subject is required.");
  if (!text && !options.html) {
    throw new Error("Email body is required (text or html).");
  }

  return mailerSend({
    to,
    subject,
    text: text || undefined,
    html: options.html || undefined,
  });
}

module.exports = sendEmail;
