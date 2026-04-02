const {
  sequelize,
  CV,
  CVStructuredData,
  CVFeaturesAnalytics,
  CVAIInsights,
} = require("../models");
const { successResponse } = require("../utils/responseHandler");
const fs = require("fs");
const util = require("util");

const unlinkFile = util.promisify(fs.unlink);

exports.listUserCVs = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  try {
    const cvs = await CV.findAll({
      where: { user_id: userId, cv_source: "cv_lab" },
      attributes: ["cv_id", "title", "file_url", "file_type", "allow_promotion", "created_at"],
      order: [["created_at", "DESC"]],
    });

    if (cvs.length === 0) {
      return successResponse(res, [], "No CVs found for this user.");
    }

    return successResponse(res, cvs);
  } catch (error) {
    console.error("Error listing user CVs:", error);
    return res.status(500).json({
      message: "Failed to fetch CV list.",
      error: error.message,
    });
  }
};

exports.getCVDetails = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  try {
    const cv = await CV.findOne({
      where: { cv_id: id, user_id: userId, cv_source: "cv_lab" },
      attributes: ["cv_id", "title", "file_url", "file_type", "allow_promotion", "created_at"],
    });

    if (!cv) {
      return res.status(404).json({
        message: "CV not found or you do not have permission to access it.",
      });
    }

    return successResponse(res, cv);
  } catch (error) {
    console.error("Error getting CV details:", error);
    return res.status(500).json({
      message: "Failed to fetch CV details.",
      error: error.message,
    });
  }
};

exports.uploadNewCV = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const { cv_title, allow_promotion } = req.body;
  const cvFile = req.file;

  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  if (!cvFile) {
    return res.status(400).json({
      message:
        "CV file is required. Use multipart/form-data and send file in one of: cv_file, file, or cv.",
      error_code: "CV_FILE_REQUIRED",
      expected_fields: ["cv_file", "file", "cv"],
      max_size_mb: 5,
      allowed_types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
  }

  const cvUrl = cvFile.path;

  try {
    const existingCount = await CV.count({ where: { user_id: userId } });
    if (existingCount >= 3) {
      if (cvUrl) {
        try {
          await unlinkFile(cvUrl);
        } catch (unlinkError) {
          console.warn("Warning: Could not delete uploaded CV file:", unlinkError);
        }
      }
      return res.status(400).json({
        message: "CV upload limit reached. Maximum 3 CVs allowed.",
        error_code: "CV_UPLOAD_LIMIT_REACHED",
        limit: 3,
      });
    }
    if (existingCount >= 1) {
      if (cvUrl) {
        try {
          await unlinkFile(cvUrl);
        } catch (unlinkError) {
          console.warn("Warning: Could not delete uploaded CV file:", unlinkError);
        }
      }
      return res.status(400).json({
        message:
          "Please delete your current CV first. Only one active CV is allowed at a time.",
        error_code: "CV_SINGLE_ACTIVE_REQUIRED",
      });
    }

    const allowPromotionValue =
      allow_promotion === true ||
      allow_promotion === "true" ||
      allow_promotion === 1 ||
      allow_promotion === "1";

    const newCV = await CV.create({
      user_id: userId,
      file_url: cvUrl,
      file_type: cvFile.mimetype,
      title: cv_title || `Uploaded CV - ${new Date().toISOString().slice(0, 10)}`,
      allow_promotion: allowPromotionValue,
      cv_source: "cv_lab",
    });

    return successResponse(
      res,
      {
        cv_id: newCV.cv_id,
        file_url: newCV.file_url,
        allow_promotion: newCV.allow_promotion,
      },
      "CV uploaded successfully.",
      201
    );
  } catch (error) {
    if (cvUrl) {
      try {
        await unlinkFile(cvUrl);
      } catch (unlinkError) {
        console.error("Could not delete uploaded CV file:", unlinkError);
      }
    }

    console.error("Error uploading new CV:", error);
    return res.status(500).json({
      message: "Failed to upload CV.",
      error: error.message,
    });
  }
};

exports.deleteUserCV = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const cv = await CV.findByPk(id, { transaction });
      if (!cv) {
        return { status: 404, body: { message: "CV not found." } };
      }

      if (cv.user_id !== userId) {
        return {
          status: 403,
          body: { message: "Forbidden: You are not allowed to delete this CV." },
        };
      }

      const fileToDelete = cv.file_url;

      await CVAIInsights.destroy({ where: { cv_id: cv.cv_id }, transaction });
      await CVFeaturesAnalytics.destroy({ where: { cv_id: cv.cv_id }, transaction });
      await CVStructuredData.destroy({ where: { cv_id: cv.cv_id }, transaction });
      await cv.destroy({ transaction });

      return { status: 200, fileToDelete };
    });

    if (result.status !== 200) {
      return res.status(result.status).json(result.body);
    }

    if (result.fileToDelete) {
      try {
        await unlinkFile(result.fileToDelete);
      } catch (unlinkError) {
        console.warn("Warning: Could not delete physical CV file:", unlinkError);
      }
    }

    return successResponse(res, null, "CV deleted successfully.");
  } catch (error) {
    console.error("Error deleting user CV:", error);
    return res.status(500).json({
      message: "Failed to delete CV.",
      error: error.message,
    });
  }
};
