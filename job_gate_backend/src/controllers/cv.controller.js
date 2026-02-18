const { CV } = require("../models");
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
      where: { user_id: userId },
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
      where: { cv_id: id, user_id: userId },
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
    return res.status(400).json({ message: "CV file is required." });
  }

  const cvUrl = cvFile.path;

  try {
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
    const cv = await CV.findByPk(id);

    if (!cv) {
      return res.status(404).json({ message: "CV not found." });
    }

    if (cv.user_id !== userId) {
      return res.status(403).json({
        message: "Forbidden: You are not allowed to delete this CV.",
      });
    }

    const fileToDelete = cv.file_url;
    await cv.destroy();

    if (fileToDelete) {
      try {
        await unlinkFile(fileToDelete);
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
