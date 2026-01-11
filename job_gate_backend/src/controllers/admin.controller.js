// file: src/controllers/admin.controller.js (الملف المُدمج والنهائي)

const {
  User,
  Admin,
  sequelize,
  JobPosting,
  Application,
  Company,
  CV,
  CompanyRequest,
} = require("../models");
const bcrypt = require("bcryptjs");
const { successResponse } = require("../utils/responseHandler");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink); // دالة لمسح الملفات (افتراضياً)
// ⚙️ دوال إدارة المستخدمين (Admin User Management)


/**
 * @desc [Admin Only] جلب جميع المستخدمين
 * @route GET /api/admin/users
 * @access Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["hashed_password"] },
    });
    return successResponse(res, users); // استخدام successResponse
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب المستخدمين", error: error.message });
  }
};

/**
 * @desc [Admin Only] جلب تفاصيل مستخدم معين
 * @route GET /api/admin/users/:id
 * @access Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["hashed_password"] },
    });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    return successResponse(res, user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب المستخدم", error: error.message });
  }
};

/**
 * @desc [Admin Only] إنشاء مستخدم جديد (بما في ذلك Admin)
 * @route POST /api/admin/users
 * @access Admin
 */
exports.createUser = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { full_name, email, password, phone, user_type } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مستخدم مسبقًا" });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const newUser = await User.create(
      {
        full_name,
        email,
        hashed_password,
        phone,
        user_type: user_type || "seeker",
      },
      { transaction: t }
    );

    if (newUser.user_type === "admin") {
      await Admin.create(
        {
          full_name: newUser.full_name,
          email: newUser.email,
          hashed_password: newUser.hashed_password,
          user_id: newUser.user_id,
        },
        { transaction: t }
      );
    }

    await t.commit();

    const successMessage =
      newUser.user_type === "admin"
        ? "تم إنشاء المستخدم كمسؤول (Admin) بنجاح"
        : "تم إنشاء المستخدم بنجاح";

    const responseUser = newUser.toJSON();
    delete responseUser.hashed_password;

    return successResponse(res, { newUser: responseUser }, successMessage, 201); // استخدام successResponse
  } catch (error) {
    await t.rollback();
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "البريد الإلكتروني أو الاسم الكامل مُسجل بالفعل.",
      });
    }
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء إنشاء المستخدم", error: error.message });
  }
};

/**
 * @desc [Admin Only] تعديل بيانات مستخدم (بما في ذلك تغيير الدور)
 * @route PUT /api/admin/users/:id
 * @access Admin
 */
exports.updateUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    const { full_name, email, phone, user_type, is_active } = req.body;
    const oldUserType = user.user_type;

    await user.update(
      { full_name, email, phone, user_type, is_active },
      { transaction: t }
    );

    // منطق تحديث جدول Admin عند تغيير الدور
    if (user_type && user_type !== oldUserType) {
      if (user_type === "admin") {
        await Admin.create(
          {
            full_name: user.full_name,
            email: user.email,
            hashed_password: user.hashed_password,
            user_id: user.user_id,
          },
          { transaction: t }
        );
      } else if (oldUserType === "admin") {
        await Admin.destroy(
          { where: { user_id: user.user_id } },
          { transaction: t }
        );
      }
    }

    // تحديث بيانات Admin إذا كان المستخدم Admin وتغيرت بياناته الأساسية
    if (user.user_type === "admin" && (full_name || email)) {
      await Admin.update(
        { full_name: user.full_name, email: user.email },
        { where: { user_id: user.user_id }, transaction: t }
      );
    }

    await t.commit();

    const responseUser = user.toJSON();
    delete responseUser.hashed_password;

    return successResponse(
      res,
      { user: responseUser },
      "تم تحديث بيانات المستخدم بنجاح"
    );
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء تحديث المستخدم", error: error.message });
  }
};

/**
 * @desc [Admin Only] حذف مستخدم
 * @route DELETE /api/admin/users/:id
 * @access Admin
 */
exports.deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    if (user.user_type === "admin") {
      await Admin.destroy(
        { where: { user_id: user.user_id } },
        { transaction: t }
      );
    }

    await user.destroy({ transaction: t });
    await t.commit();

    return successResponse(res, null, "تم حذف المستخدم بنجاح");
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء حذف المستخدم", error: error.message });
  }
};

// 📋 دوال إدارة الوظائف والطلبات (Job & Application Management)

/**
 * @desc [Admin Only] عرض جميع إعلانات الوظائف (بما في ذلك المسودة والمغلقة)
 * @route GET /api/admin/job-postings
 * @access Admin
 */
exports.listAllJobPostings = async (req, res) => {
  try {
    const jobPostings = await JobPosting.findAll({
      include: [
        { model: Company, attributes: ["company_id", "name", "email"] },
      ],
      attributes: ["job_id", "title", "status", "form_type", "created_at"],
      order: [["request_id", "DESC"]],
    });

    return successResponse(res, jobPostings);
  } catch (error) {
    console.error("Admin error listing all job postings:", error);
    return res.status(500).json({
      message: "فشل في جلب جميع إعلانات الوظائف.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] عرض جميع طلبات التوظيف من كل المستخدمين والوظائف
 * @route GET /api/admin/applications
 * @access Admin
 */
exports.listAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      attributes: ["application_id", "status", "submitted_at", "review_notes"],
      include: [
        {
          model: JobPosting,
          attributes: ["job_id", "title"],
          include: [{ model: Company, attributes: ["name"] }],
        },
        {
          model: User,
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    return successResponse(res, applications);
  } catch (error) {
    console.error("Admin error listing all applications:", error);
    return res.status(500).json({
      message: "فشل في جلب جميع طلبات التوظيف.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] تحديث حالة طلب توظيف معين (قبول، رفض، مراجعة)
 * @route PUT /api/admin/applications/:id
 * @access Admin
 */
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, review_notes } = req.body;

  const validStatuses = ["pending", "reviewed", "accepted", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: `الحالة غير صالحة. يجب أن تكون واحدة من: ${validStatuses.join(
        ", "
      )}`,
    });
  }

  try {
    const application = await Application.findByPk(id);

    if (!application) {
      return res.status(404).json({ message: "طلب التوظيف غير موجود." });
    }

    await application.update({
      status: status,
      review_notes: review_notes || application.review_notes,
    });

    return successResponse(
      res,
      {
        application_id: application.application_id,
        status: application.status,
        review_notes: application.review_notes,
      },
      `تم تحديث حالة طلب التوظيف بنجاح إلى ${status}.`
    );
  } catch (error) {
    console.error("Admin error updating application status:", error);
    return res
      .status(500)
      .json({ message: "فشل في تحديث حالة الطلب.", error: error.message });
  }
};

//  دوال إدارة السير الذاتية (Admin CV Management)

/**
 * @desc [Admin Only] عرض جميع سجلات السير الذاتية المرفوعة
 * @route GET /api/admin/cvs
 * @access Admin
 */
exports.listAllCVs = async (req, res) => {
  try {
    const cvs = await CV.findAll({
      attributes: ["cv_id", "title", "file_url", "file_type", "created_at"],
      include: [
        {
          model: User,
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    return successResponse(res, cvs);
  } catch (error) {
    console.error("Admin error listing all CVs:", error);
    return res.status(500).json({
      message: "فشل في جلب جميع سجلات السير الذاتية.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] جلب أحدث سيرة ذاتية لمستخدم معين وتنزيلها (افتراضياً)
 * @route GET /api/admin/cvs/:userId/download
 * @access Admin
 */
exports.getAndDownloadUserCV = async (req, res) => {
  const { userId } = req.params;

  try {
    const cv = await CV.findOne({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });

    if (!cv) {
      return res
        .status(404)
        .json({ message: "لا توجد سيرة ذاتية مُسجّلة لهذا المستخدم." });
    }

    const filePath = cv.file_url;
    // يجب التأكد من أن file_url يشير لمسار محلي يمكن قراءته
    if (fs.existsSync(filePath)) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${userId}_${cv.cv_id}.pdf`
      );
      res.setHeader("Content-Type", cv.file_type || "application/pdf");
      return res.sendFile(filePath);
    } else {
      return res
        .status(404)
        .json({ message: "ملف السيرة الذاتية غير موجود في مسار التخزين." });
    }
  } catch (error) {
    console.error("Admin error fetching/downloading user CV:", error);
    return res.status(500).json({
      message: "فشل في جلب أو تنزيل السيرة الذاتية.",
      error: error.message,
    });
  }
};

//  دوال إدارة طلبات الشركات (Admin Company Requests)

/**
 * @desc [Admin Only] عرض جميع طلبات تسجيل الشركات
 * @route GET /api/admin/company-requests
 * @access Admin
 */
exports.listCompanyRequests = async (req, res) => {
  try {
    const requests = await CompanyRequest.findAll({
      order: [["created_at", "DESC"]],
    });
    return successResponse(res, requests);
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب طلبات الشركات",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] الموافقة على طلب شركة وإنشاء حسابها
 * @route PUT /api/admin/company-requests/approve/:id
 * @access Admin
 */
exports.approveCompanyRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const request = await CompanyRequest.findByPk(req.params.id, {
      transaction: t,
    });

    if (!request) {
      await t.rollback();
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    if (request.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ message: "تم معالجة هذا الطلب مسبقاً." });
    }

    //  إنشاء حساب الشركة
    const newCompany = await Company.create(
      {
        name: request.name,
        email: request.email,
        phone: request.phone,
        license_doc_url: request.license_doc_url,
        logo_url: request.logo_url,
        description: request.description,
        is_approved: true,
      },
      { transaction: t }
    );

    //  تحديث حالة الطلب
    request.status = "approved";
    request.approved_company_id = newCompany.company_id;
    await request.save({ transaction: t });

    await t.commit();
    return successResponse(
      res,
      { company: newCompany },
      "تمت الموافقة على الطلب وإنشاء حساب الشركة بنجاح"
    );
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      message: "حدث خطأ أثناء الموافقة على الطلب",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] رفض طلب شركة وتحديث حالته
 * @route PUT /api/admin/company-requests/reject/:id
 * @access Admin
 */
exports.rejectCompanyRequest = async (req, res) => {
  try {
    const request = await CompanyRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "تم معالجة هذا الطلب مسبقاً (مقبول أو مرفوض سابقًا).",
      });
    }

    const { admin_review_notes } = req.body;
    if (!admin_review_notes) {
      return res.status(400).json({
        message: "ملاحظات المسؤول (admin_review_notes) مطلوبة لرفض الطلب.",
      });
    }

    request.status = "rejected";
    request.admin_review_notes = admin_review_notes;
    await request.save();

    return successResponse(
      res,
      { rejectedRequest: request },
      "تم رفض الطلب بنجاح وإرسال إشعار للشركة"
    );
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء رفض الطلب", error: error.message });
  }
};

// 💡 يمكن إضافة دالة لحذف شركة هنا:
/* @desc [Private/Admin] حذف شركة
 * @route DELETE /api/admin/companies/:id
 * @access Private (يتطلب دور Admin)
 */
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);

    // 1. التحقق من وجود الشركة
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    // 2. [تحسين] يجب الانتباه هنا:
    //    قد تحتاج إلى التعامل مع الكيانات المرتبطة مثل إعلانات الوظائف (JobPostings)
    //    والتطبيقات (Applications). يمكنك:
    //    أ. حذفها جميعاً (باستخدام ON DELETE CASCADE في تعريف النموذج).
    //    ب. أو منع الحذف إذا كانت هناك وظائف نشطة (لضمان سلامة البيانات).

    // 3. تنفيذ الحذف
    await company.destroy();

    // 4. الرد بنجاح
    return successResponse(res, null, "تم حذف الشركة بنجاح");
  } catch (error) {
    console.error("Error deleting company:", error);
    // إذا كان الخطأ بسبب قيود المفتاح الخارجي (Foreign Key)
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        message: "لا يمكن حذف الشركة، لوجود وظائف أو بيانات مرتبطة بها.",
        error: error.message,
      });
    }

    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء حذف الشركة", error: error.message });
  }
};
