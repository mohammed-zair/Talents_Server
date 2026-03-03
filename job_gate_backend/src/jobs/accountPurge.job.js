const path = require("path");
const fs = require("fs/promises");
const { Op } = require("sequelize");
const { User, Company, CV } = require("../models");

const GRACE_DAYS = parseInt(process.env.ACCOUNT_DELETE_GRACE_DAYS || "30", 10);
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const uploadsRoot = path.resolve(__dirname, "../../uploads");

const resolveLocalFilePath = (fileUrl) => {
  if (!fileUrl) return null;
  const raw = String(fileUrl);
  if (/^https?:\/\//i.test(raw)) return null;
  const relative = raw.startsWith("/") ? raw.slice(1) : raw;
  const fullPath = path.resolve(__dirname, "../../", relative);
  if (!fullPath.startsWith(uploadsRoot)) return null;
  return fullPath;
};

const safeDeleteFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Failed to delete file:", filePath, error?.message || error);
    }
  }
};

const purgeDeletedUsers = async (cutoffDate) => {
  const users = await User.findAll({
    where: {
      is_deleted: true,
      deleted_at: { [Op.lte]: cutoffDate },
    },
    attributes: ["user_id"],
    include: [{ model: CV, attributes: ["cv_id", "file_url"], required: false }],
  });

  for (const user of users) {
    for (const cv of user.CVs || []) {
      await safeDeleteFile(resolveLocalFilePath(cv.file_url));
    }
    await User.destroy({ where: { user_id: user.user_id } });
  }

  return users.length;
};

const purgeDeletedCompanies = async (cutoffDate) => {
  const companies = await Company.findAll({
    where: {
      is_deleted: true,
      deleted_at: { [Op.lte]: cutoffDate },
    },
    attributes: ["company_id"],
  });

  for (const company of companies) {
    await Company.destroy({ where: { company_id: company.company_id } });
  }

  return companies.length;
};

const runAccountPurge = async () => {
  const cutoffDate = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);
  const purgedUsers = await purgeDeletedUsers(cutoffDate);
  const purgedCompanies = await purgeDeletedCompanies(cutoffDate);
  if (purgedUsers || purgedCompanies) {
    console.log(
      `[account-purge] Purged users=${purgedUsers}, companies=${purgedCompanies}, cutoff=${cutoffDate.toISOString()}`
    );
  }
};

const startAccountPurgeScheduler = () => {
  const enabled = String(process.env.ACCOUNT_PURGE_ENABLED || "true") !== "false";
  if (!enabled) {
    console.log("[account-purge] Scheduler disabled.");
    return;
  }

  runAccountPurge().catch((error) =>
    console.error("[account-purge] Initial run failed:", error)
  );

  setInterval(() => {
    runAccountPurge().catch((error) =>
      console.error("[account-purge] Scheduled run failed:", error)
    );
  }, INTERVAL_MS);
};

module.exports = {
  runAccountPurge,
  startAccountPurgeScheduler,
};

