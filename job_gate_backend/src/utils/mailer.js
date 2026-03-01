// file: src/utils/mailer.js
const axios = require("axios");
const nodemailer = require("nodemailer");

function getFrom() {
  const fromName = process.env.SMTP_FROM_NAME || "Talents We Trust";
  const fromEmail = process.env.GMAIL_USER || "talentswetrust@gmail.com";
  return `${fromName} <${fromEmail}>`;
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

function toBase64Url(input) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getGmailApiAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN missing in .env"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }).toString();

  const { data } = await axios.post("https://oauth2.googleapis.com/token", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });

  if (!data?.access_token) {
    throw new Error("Failed to obtain Gmail API access token.");
  }

  return data.access_token;
}

async function sendWithGmailApi({ to, subject, html, text }) {
  const from = getFrom();
  const contentType = html ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";
  const body = html || text || "";

  const rawMessage = [
    `From: ${from}`,
    `To: ${to}`,
    "MIME-Version: 1.0",
    `Content-Type: ${contentType}`,
    `Subject: ${subject}`,
    "",
    body,
  ].join("\r\n");

  const accessToken = await getGmailApiAccessToken();
  const encoded = toBase64Url(rawMessage);

  const gmailUser = process.env.GMAIL_USER || "me";
  return axios.post(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(gmailUser)}/messages/send`,
    { raw: encoded },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 20000,
    }
  );
}

async function sendEmail({ to, subject, html, text }) {
  const provider = (process.env.EMAIL_PROVIDER || "gmail_api").toLowerCase();
  if (provider === "gmail") {
    console.log("MAILER provider = gmail (smtp)");
    return sendWithGmail({ to, subject, html, text });
  }
  if (provider === "gmail_api") {
    console.log("MAILER provider = gmail_api (https)");
    return sendWithGmailApi({ to, subject, html, text });
  }

  console.warn(`MAILER provider "${provider}" requested; defaulting to gmail_api.`);
  return sendWithGmailApi({ to, subject, html, text });
}

module.exports = { sendEmail };
