// file: src/utils/mailer.js
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

function getFrom() {
  const fromName = process.env.SMTP_FROM_NAME || "Talents We Trust";
  const fromEmail =
    process.env.SMTP_FROM_EMAIL ||
    process.env.GMAIL_USER ||
    "talentswetrust@gmail.com";
  return `${fromName} <${fromEmail}>`;
}

/** RESEND */
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  return new Resend(key);
}

async function sendWithResend({ to, subject, html, text }) {
  const resend = getResend();
  return resend.emails.send({
    from: getFrom(),
    to,
    subject,
    text: text || undefined,
    html: html || (text ? `<p>${text.replace(/\n/g, "<br>")}</p>` : undefined),
  });
}

/** GMAIL SMTP */
async function sendWithGmail({ to, subject, html, text }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD missing in .env");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    text: text || undefined,
    html: html || (text ? `<p>${text.replace(/\n/g, "<br>")}</p>` : undefined),
  });
}

async function sendEmail({ to, subject, html, text }) {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

  if (provider === "gmail") return sendWithGmail({ to, subject, html, text });
  return sendWithResend({ to, subject, html, text });
}

module.exports = { sendEmail };
