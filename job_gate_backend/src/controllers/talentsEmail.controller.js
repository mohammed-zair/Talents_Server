const axios = require("axios");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { User, CV, CVStructuredData, sequelize } = require("../models");
const {
  extractTextFromFile,
  extractEmailFromText,
} = require("../utils/cvTextExtractor");

const CV_IMPORT_DIR = path.join(__dirname, "../../uploads/cv_imports");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildTempPassword(length = 10) {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += charset[crypto.randomInt(0, charset.length)];
  }
  return result;
}

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const buildNameFromEmail = (email) => {
  const safe = String(email || "").split("@")[0] || "user";
  const name = safe.replace(/[._-]+/g, " ").trim();
  return name.length > 0 ? name : "user";
};

async function sendTalentsPayload(payloadUsers) {
  const endpointUrl =
    process.env.TALENTS_EMAIL_URL || "https://hadaef.com/api/talents/email";
  const secret = process.env.TALENTS_EMAIL_SECRET;

  if (!secret) {
    throw new Error("TALENTS_EMAIL_SECRET is not configured.");
  }

  const response = await axios.post(endpointUrl, payloadUsers, {
    headers: {
      "Content-Type": "application/json",
      "X-Talents-Secret": secret,
    },
    timeout: 20000,
  });

  const failed = Array.isArray(response.data?.failed)
    ? response.data.failed
    : [];
  const failedSet = new Set(failed.map((email) => normalizeEmail(email)));

  const updates = payloadUsers
    .filter((entry) => !failedSet.has(normalizeEmail(entry.email)))
    .map((entry) => ({
      userId: entry.id,
      password: entry.password,
    }));

  let updatedCount = 0;
  if (updates.length > 0) {
    await sequelize.transaction(async (t) => {
      await Promise.all(
        updates.map(async (entry) => {
          const hashed = await bcrypt.hash(entry.password, 10);
          const [updatedRows] = await User.update(
            { hashed_password: hashed },
            { where: { user_id: entry.userId }, transaction: t },
          );
          if (updatedRows > 0) updatedCount += 1;
        }),
      );
    });
  }

  return {
    response,
    failed,
    updatedCount,
  };
}

exports.sendTalentsInviteEmails = async (req, res) => {
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const sendAll = Boolean(req.body?.sendAll);

  try {
    const users =
      sendAll || userIds.length === 0
        ? await User.findAll({ attributes: ["user_id", "full_name", "email"] })
        : await User.findAll({
            where: { user_id: userIds },
            attributes: ["user_id", "full_name", "email"],
          });

    const validUsers = users.filter((user) => user.email);
    if (validUsers.length === 0) {
      return res
        .status(400)
        .json({ message: "No users with valid emails found." });
    }

    const payloadUsers = validUsers.map((user) => ({
      id: user.user_id,
      name: user.full_name || user.email,
      email: user.email,
      password: buildTempPassword(),
    }));

    const { response, failed, updatedCount } =
      await sendTalentsPayload(payloadUsers);
    console.log("[Talents Email] Response:", {
      status: response.status,
      data: response.data,
    });

    return res.status(200).json({
      requested: response.data?.requested ?? payloadUsers.length,
      sent: response.data?.sent ?? payloadUsers.length - failed.length,
      failed,
      passwords_updated: updatedCount,
      raw_response: response.data ?? null,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data || error.message || "Failed to send Talents emails.";
    return res.status(status).json({ message });
  }
};

exports.processCvImports = async (req, res) => {
  ensureDir(CV_IMPORT_DIR);

  try {
    const files = await fs.promises.readdir(CV_IMPORT_DIR);
    const cvFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ext === ".pdf" || ext === ".docx";
    });

    if (cvFiles.length === 0) {
      return res.status(200).json({
        message: "No CV files found in import folder.",
        import_dir: CV_IMPORT_DIR,
        processed: 0,
      });
    }

    const createdUsers = [];
    const existingUsers = [];
    const skippedNoEmail = [];
    const failed = [];
    const payloadUsers = [];

    for (const fileName of cvFiles) {
      const filePath = path.join(CV_IMPORT_DIR, fileName);
      try {
        const rawText = await extractTextFromFile(filePath);
        const email = extractEmailFromText(rawText);

        if (!email) {
          skippedNoEmail.push(fileName);
          continue;
        }

        const normalizedEmail = normalizeEmail(email);
        let user = await User.findOne({ where: { email: normalizedEmail } });
        let password = null;

        if (!user) {
          password = buildTempPassword(10);
          const hashed = await bcrypt.hash(password, 10);
          const fullName = buildNameFromEmail(normalizedEmail);

          user = await User.create({
            full_name: fullName,
            email: normalizedEmail,
            hashed_password: hashed,
            user_type: "seeker",
            profile_completed: false,
          });

          createdUsers.push({ user_id: user.user_id, email: normalizedEmail });
          payloadUsers.push({
            id: user.user_id,
            name: user.full_name || user.email,
            email: user.email,
            password,
          });
        } else {
          existingUsers.push({ user_id: user.user_id, email: normalizedEmail });
        }

        const cvRecord = await CV.create({
          user_id: user.user_id,
          title: `Imported CV - ${new Date().toISOString().slice(0, 10)}`,
          file_type: path.extname(fileName).toLowerCase().replace(".", ""),
          file_url: null,
        });

        await CVStructuredData.create({
          cv_id: cvRecord.cv_id,
          data_json: {
            email: normalizedEmail,
            source_file: fileName,
            extracted_at: new Date().toISOString(),
          },
        });

        await fs.promises.unlink(filePath);
      } catch (error) {
        failed.push({ file: fileName, error: error.message });
      }
    }

    let emailResult = null;
    if (payloadUsers.length > 0) {
      const {
        response,
        failed: failedEmails,
        updatedCount,
      } = await sendTalentsPayload(payloadUsers);
      emailResult = {
        requested: response.data?.requested ?? payloadUsers.length,
        sent: response.data?.sent ?? payloadUsers.length - failedEmails.length,
        failed: failedEmails,
        passwords_updated: updatedCount,
      };
    }

    return res.status(200).json({
      processed: cvFiles.length,
      created_users: createdUsers.length,
      existing_users: existingUsers.length,
      skipped_no_email: skippedNoEmail,
      failed,
      email_result: emailResult,
      import_dir: CV_IMPORT_DIR,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
