const axios = require("axios");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { User, sequelize } = require("../models");

function buildTempPassword(length = 12) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += charset[crypto.randomInt(0, charset.length)];
  }
  return result;
}

exports.sendTalentsInviteEmails = async (req, res) => {
  const endpointUrl = process.env.TALENTS_EMAIL_URL || "https://hadaef.com/api/talents/email";
  const secret = process.env.TALENTS_EMAIL_SECRET;

  if (!secret) {
    return res.status(500).json({ message: "TALENTS_EMAIL_SECRET is not configured." });
  }

  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const sendAll = Boolean(req.body?.sendAll);

  try {
    const users = sendAll || userIds.length === 0
      ? await User.findAll({ attributes: ["user_id", "full_name", "email"] })
      : await User.findAll({
          where: { user_id: userIds },
          attributes: ["user_id", "full_name", "email"],
        });

    const validUsers = users.filter((user) => user.email);
    if (validUsers.length === 0) {
      return res.status(400).json({ message: "No users with valid emails found." });
    }

    const payloadUsers = validUsers.map((user) => ({
      id: user.user_id,
      name: user.full_name || user.email,
      email: user.email,
      password: buildTempPassword(),
    }));

    const response = await axios.post(endpointUrl, payloadUsers, {
      headers: {
        "Content-Type": "application/json",
        "X-Talents-Secret": secret,
      },
      timeout: 20000,
    });
    console.log("[Talents Email] Response:", {
      status: response.status,
      data: response.data,
    });

    const failed = Array.isArray(response.data?.failed) ? response.data.failed : [];
    const failedSet = new Set(failed.map((email) => String(email).toLowerCase()));

    const updates = payloadUsers
      .filter((entry) => !failedSet.has(String(entry.email).toLowerCase()))
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
              { where: { user_id: entry.userId }, transaction: t }
            );
            if (updatedRows > 0) updatedCount += 1;
          })
        );
      });
    }

    return res.status(200).json({
      requested: response.data?.requested ?? payloadUsers.length,
      sent: response.data?.sent ?? updates.length,
      failed,
      passwords_updated: updatedCount,
      raw_response: response.data ?? null,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message || "Failed to send Talents emails.";
    return res.status(status).json({ message });
  }
};
