// file: src/utils/mailer.js
const { Resend } = require("resend");

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY missing (check .env + restart with --update-env)");
  }
  return new Resend(key);
}

async function sendEmail({ to, subject, html, text }) {
  const resend = getResend();

  const fromName = process.env.SMTP_FROM_NAME || "Talents We Trust";
  const fromEmail = process.env.SMTP_FROM_EMAIL || "onboarding@resend.dev";

  return resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html: html || (text ? `<pre>${text}</pre>` : "<p></p>"),
  });
}

module.exports = { sendEmail };
