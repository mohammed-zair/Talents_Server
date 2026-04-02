// file: src/utils/mailer.js
const axios = require("axios");
const nodemailer = require("nodemailer");
const MailComposer = require("nodemailer/lib/mail-composer");

class MailerError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MailerError";
    this.code = details.code || "MAILER_ERROR";
    this.provider = details.provider || null;
    this.status = details.status || null;
    this.phase = details.phase || null;
    this.recipient = details.recipient || null;
    this.retryable = Boolean(details.retryable);
    this.cause = details.cause || null;
  }
}

const maskRecipient = (value) => {
  const email = String(Array.isArray(value) ? value[0] || "" : value || "").trim();
  const [local, domain] = email.split("@");
  if (!local || !domain) return email || null;
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
};

const buildAxiosMailerError = (error, details = {}) => {
  const status = error?.response?.status || null;
  const provider = details.provider || "unknown";
  const phase = details.phase || "send";
  const recipient = maskRecipient(details.recipient);
  const responseData = error?.response?.data;
  const providerMessage =
    responseData?.error?.message ||
    responseData?.error_description ||
    responseData?.message ||
    error?.message ||
    "Email delivery failed.";

  return new MailerError(providerMessage, {
    code: details.code || `MAILER_${String(provider).toUpperCase()}_${String(phase).toUpperCase()}_FAILED`,
    provider,
    status,
    phase,
    recipient,
    retryable: !status || status >= 500 || error?.code === "ECONNABORTED",
    cause: {
      axios_code: error?.code || null,
      provider_error:
        typeof responseData === "string"
          ? responseData.slice(0, 300)
          : responseData || null,
    },
  });
};

const wrapMailerError = (error, details = {}) => {
  if (error instanceof MailerError) return error;
  if (error?.isAxiosError || error?.response) {
    return buildAxiosMailerError(error, details);
  }

  return new MailerError(error?.message || "Email delivery failed.", {
    code: details.code || "MAILER_SEND_FAILED",
    provider: details.provider || "unknown",
    phase: details.phase || "send",
    recipient: maskRecipient(details.recipient),
    retryable: Boolean(error?.code && String(error.code).startsWith("E")),
    cause: {
      code: error?.code || null,
      name: error?.name || null,
    },
  });
};

const logMailerFailure = (error) => {
  const safe = error instanceof MailerError ? error : wrapMailerError(error);
  console.error("MAILER failure:", {
    provider: safe.provider,
    phase: safe.phase,
    code: safe.code,
    status: safe.status,
    recipient: safe.recipient,
    retryable: safe.retryable,
    message: safe.message,
    cause: safe.cause,
  });
  return safe;
};

function getFrom() {
  const fromName = process.env.SMTP_FROM_NAME || "Talents We Trust";
  const fromEmail =
    process.env.SMTP_FROM_EMAIL ||
    process.env.GMAIL_USER ||
    "talentswetrust@gmail.com";
  return `${fromName} <${fromEmail}>`;
}

/** RESEND HTTPS API */
async function sendWithResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing in .env");
  }

  const from = getFrom();
  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
  };

  try {
    return await axios.post("https://api.resend.com/emails", payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });
  } catch (error) {
    throw wrapMailerError(error, {
      provider: "resend",
      phase: "send",
      recipient: to,
      code: "MAILER_RESEND_SEND_FAILED",
    });
  }
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

  try {
    return await transporter.sendMail({
      from: getFrom(),
      to,
      subject,
      text: text || undefined,
      html: html || (text ? `<p>${text.replace(/\n/g, "<br>")}</p>` : undefined),
    });
  } catch (error) {
    throw wrapMailerError(error, {
      provider: "gmail",
      phase: "send",
      recipient: to,
      code: "MAILER_GMAIL_SMTP_SEND_FAILED",
    });
  }
}

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(String(input), "utf8");
  return buffer
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

  let data;
  try {
    ({ data } = await axios.post("https://oauth2.googleapis.com/token", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    }));
  } catch (error) {
    throw wrapMailerError(error, {
      provider: "gmail_api",
      phase: "oauth",
      code: "MAILER_GMAIL_API_OAUTH_FAILED",
    });
  }

  if (!data?.access_token) {
    throw new Error("Failed to obtain Gmail API access token.");
  }

  return data.access_token;
}

async function sendWithGmailApi({ to, subject, html, text }) {
  const from = getFrom();
  const mail = new MailComposer({
    from,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
    textEncoding: "base64",
  });

  const rawBuffer = await mail.compile().build();

  const accessToken = await getGmailApiAccessToken();
  const encoded = toBase64Url(rawBuffer);

  const gmailUser = process.env.GMAIL_USER || "me";
  try {
    return await axios.post(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(gmailUser)}/messages/send`,
      { raw: encoded },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 20000,
      }
    );
  } catch (error) {
    throw wrapMailerError(error, {
      provider: "gmail_api",
      phase: "send",
      recipient: to,
      code: "MAILER_GMAIL_API_SEND_FAILED",
    });
  }
}

async function sendEmail({ to, subject, html, text }) {
  const provider = (process.env.EMAIL_PROVIDER || "gmail_api").toLowerCase();
  try {
    if (provider === "resend") {
      console.log("MAILER provider = resend (https)");
      return await sendWithResend({ to, subject, html, text });
    }
    if (provider === "gmail") {
      console.log("MAILER provider = gmail (smtp)");
      return await sendWithGmail({ to, subject, html, text });
    }
    if (provider === "gmail_api") {
      console.log("MAILER provider = gmail_api (https)");
      return await sendWithGmailApi({ to, subject, html, text });
    }

    console.warn(
      `MAILER provider "${provider}" requested; defaulting to resend/gmail_api by availability.`
    );
    if (process.env.RESEND_API_KEY) {
      return await sendWithResend({ to, subject, html, text });
    }
    return await sendWithGmailApi({ to, subject, html, text });
  } catch (error) {
    throw logMailerFailure(error);
  }
}

module.exports = { sendEmail, MailerError };
