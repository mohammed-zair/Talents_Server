// file: src/controllers/cv.controller.js (الملف المُدمج والنهائي)

const { CV, User } = require("../models");
const { successResponse } = require("../utils/responseHandler");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink); // لضمان حذف الملف بشكل آمن في async/await

 //   دوال إدارة السيرة الذاتية (CV Management Functions)
 
/** 
 * @desc [Private] عرض جميع السير الذاتية المسجلة للمستخدم الحالي
 * @route GET /api/user/cvs
 * @access Private (يتطلب مصادقة)
 */
exports.listUserCVs = async (req, res) => {
  const { user_id } = req.user;

  try {
    const cvs = await CV.findAll({
      where: { user_id },
      attributes: [
        "cv_id",
        "title",
        "file_url",
        "file_type",
        "allow_promotion",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    if (cvs.length === 0) {
      return successResponse(res, [], "لا توجد سير ذاتية مسجلة حتى الآن.");
    }

    return successResponse(res, cvs);
  } catch (error) {
    console.error("Error listing user CVs:", error);
    return res
      .status(500)
      .json({
        message: "فشل في جلب قائمة السير الذاتية.",
        error: error.message,
      });
  }
};

/**
 * @desc [Private] عرض تفاصيل سيرة ذاتية محددة للمستخدم
 * @route GET /api/user/cvs/:id
 * @access Private (يتطلب مصادقة)
 */
exports.getCVDetails = async (req, res) => {
  const { user_id } = req.user;
  const { id } = req.params;

  try {
    const cv = await CV.findOne({
      where: { cv_id: id, user_id }, // يجب التأكد من أن الـ CV يخص المستخدم
      attributes: [
        "cv_id",
        "title",
        "file_url",
        "file_type",
        "allow_promotion",
        "created_at",
      ],
    });

    if (!cv) {
      return res
        .status(404)
        .json({
          message: "السيرة الذاتية غير موجودة أو لا تملك صلاحية الوصول إليها.",
        });
    }

    return successResponse(res, cv);
  } catch (error) {
    console.error("Error getting CV details:", error);
    return res
      .status(500)
      .json({
        message: "فشل في جلب تفاصيل السيرة الذاتية.",
        error: error.message,
      });
  }
};

/**
 * @desc [Private] رفع سيرة ذاتية جديدة (إنشاء)
 * @route POST /api/user/cvs
 * @access Private (يتطلب مصادقة و middleware الرفع)
 */
exports.uploadNewCV = async (req, res) => {
  const { user_id } = req.user;
  const { cv_title, allow_promotion } = req.body;
  const cv_file = req.file;

  if (!cv_file) {
    return res.status(400).json({ message: "يجب رفع ملف سيرة ذاتية (CV)." });
  }

  const cv_url = cv_file.path; // المسار النهائي الذي تم حفظه بواسطة Multer

  try {
    const allowPromotionValue =
      allow_promotion === true ||
      allow_promotion === "true" ||
      allow_promotion === 1 ||
      allow_promotion === "1";

    // إنشاء سجل جديد للسيرة الذاتية
    const newCV = await CV.create({
      user_id,
      file_url: cv_url,
      file_type: cv_file.mimetype,
      title:
        cv_title ||
        `سيرة ذاتية مرفوعة - ${new Date().toISOString().slice(0, 10)}`,
      allow_promotion: allowPromotionValue,
    });

    return successResponse(
      res,
      { cv_id: newCV.cv_id, file_url: newCV.file_url, allow_promotion: newCV.allow_promotion },
      "تم رفع السيرة الذاتية بنجاح.",
      201
    );
  } catch (error) {
    //   تحسين: حذف الملف المرفوع إذا فشل إنشاء السجل في قاعدة البيانات
    if (cv_url) {
      try {
        await unlinkFile(cv_url);
      } catch (unlinkError) {
        console.error("Could not delete uploaded CV file:", unlinkError);
      }
    }

    console.error("Error uploading new CV:", error);
    return res
      .status(500)
      .json({ message: "فشل في رفع السيرة الذاتية.", error: error.message });
  }
};

/**
 * @desc [Private] حذف سيرة ذاتية محددة للمستخدم
 * @route DELETE /api/user/cvs/:id
 * @access Private (يتطلب مصادقة)
 */
exports.deleteUserCV = async (req, res) => {
  const { user_id } = req.user;
  const { id } = req.params;

  try {
    const cv = await CV.findOne({
      where: { cv_id: id, user_id }, // يجب التأكد من الملكية قبل الحذف
    });

    if (!cv) {
      return res
        .status(404)
        .json({
          message: "السيرة الذاتية غير موجودة أو لا تملك صلاحية حذفها.",
        });
    }

    const fileToDelete = cv.file_url;

    // 1. حذف السجل من قاعدة البيانات
    await cv.destroy();

    // 2. حذف الملف المادي
    if (fileToDelete) {
      try {
        // إذا كان المسار محلياً، نستخدم unlinkFile
        await unlinkFile(fileToDelete);
      } catch (unlinkError) {
        // قد يفشل الحذف المادي إذا كان المسار خارجياً (S3/Cloud Storage)
        console.warn(
          "Warning: Could not delete physical CV file:",
          unlinkError
        );
      }
    }

    return successResponse(res, null, "تم حذف السيرة الذاتية بنجاح.");
  } catch (error) {
    console.error("Error deleting user CV:", error);
    return res
      .status(500)
      .json({ message: "فشل في حذف السيرة الذاتية.", error: error.message });
  }
};