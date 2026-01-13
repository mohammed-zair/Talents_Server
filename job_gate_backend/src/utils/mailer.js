// file: src/utils/mailer.js
const sgMail = require("@sendgrid/mail");

function sendEmail({ to, subject, html, text }) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  return sgMail.send({
    to,
    from: {
      email: process.env.SMTP_FROM_EMAIL,
      name: process.env.SMTP_FROM_NAME,
    },
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };
