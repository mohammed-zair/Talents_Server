// file: src/controllers/jobPosting.controller.js
const sequelize = require("../config/db.config");
const { JobPosting, JobForm, JobFormField, Application, CV, CVAIInsights } = require("../models");
const { successResponse } = require("../utils/responseHandler");
const aiService = require("../services/aiService");
const fs = require("fs");
const path = require("path");

const ALLOWED_FORM_INPUT_TYPES = new Set([
  "text",
  "number",
  "email",
  "file",
  "select",
  "textarea",
  "checkbox",
  "radio",
]);

const normalizeFormOptions = (raw) => {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((opt) => String(opt).trim())
      .filter((opt) => opt.length > 0);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((opt) => String(opt).trim())
          .filter((opt) => opt.length > 0);
      }
    } catch (_) {
      // fall through to single string
    }
    return [trimmed];
  }
  return [String(raw).trim()].filter((opt) => opt.length > 0);
};

const normalizeFormFields = (fields) => {
  if (!Array.isArray(fields)) {
    return { error: "Form fields must be an array." };
  }

  const normalized = [];

  for (const field of fields) {
    if (!field || typeof field !== "object") {
      return { error: "Each form field must be an object." };
    }

    // Backward-compatible mapping for older dashboards:
    // title/label and input_type/type.
    const title = String(field.title || field.label || "").trim();
    if (!title) {
      return { error: "Field title is required." };
    }

    let inputType = String(field.input_type || field.type || "").trim().toLowerCase();
    if (inputType === "multi") {
      inputType = "select";
    }
    if (!ALLOWED_FORM_INPUT_TYPES.has(inputType)) {
      return { error: `Invalid input_type: ${inputType}` };
    }

    const rawOptions = field.options ?? field.choices;
    const options = normalizeFormOptions(rawOptions);
    if (["select", "checkbox", "radio"].includes(inputType) && options.length === 0) {
      return { error: `Options are required for ${inputType} fields.` };
    }

    normalized.push({
      title,
      description: field.description ? String(field.description) : null,
      is_required: Boolean(field.is_required),
      input_type: inputType,
      options,
    });
  }

  return { fields: normalized };
};
/**
 * @desc [Company] إنشاء إعلان توظيف جديد (مع صورة)
 * @route POST /api/companies/company/job-postings
 * @access Private (Company)
 */
exports.createJobPosting = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const company = req.company;

    const safeJsonParse = (value, fallback) => {
      if (value === undefined || value === null) return fallback;
      if (typeof value !== "string") return value;
      const s = value.trim();
      if (!s) return fallback;
      try {
        return JSON.parse(s);
      } catch (_) {
        return fallback;
      }
    };

    const toBool = (value, fallback) => {
      if (value === undefined || value === null) return fallback;
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      const s = String(value).trim().toLowerCase();
      if (!s) return fallback;
      if (["true", "1", "yes", "y", "on"].includes(s)) return true;
      if (["false", "0", "no", "n", "off"].includes(s)) return false;
      return fallback;
    };

    const {
      title,
      description,
      requirements,
      industry,
      salary_min,
      salary_max,
      location,
      form_type,
      external_form_url,
      require_cv = true,
      form_fields = [],
      is_anonymous = false,
      is_remote = false,
    } = req.body;

    const normalizedFormFields = safeJsonParse(form_fields, form_fields);
    const parsedFormFields = Array.isArray(normalizedFormFields)
      ? normalizedFormFields
      : [];

    const normalizedRequireCv = toBool(require_cv, true);
    const normalizedIsAnonymous = toBool(is_anonymous, false);
    const normalizedIsRemote = toBool(is_remote, false);

    const normalizedRequirements = safeJsonParse(requirements, requirements);
    const requirementsText =
      Array.isArray(normalizedRequirements)
        ? JSON.stringify(normalizedRequirements)
        : (normalizedRequirements !== undefined && normalizedRequirements !== null
          ? String(normalizedRequirements)
          : null);

    if (!title || !description || !form_type) {
      await t.rollback();
      return res.status(400).json({
        message: "العنوان والوصف ونوع النموذج إجباريون",
      });
    }

    if (form_type === "external_link" && !external_form_url) {
      await t.rollback();
      return res.status(400).json({
        message: "رابط النموذج الخارجي مطلوب",
      });
    }

    // 🆕 رابط صورة الوظيفة
    const jobImageUrl = req.file
      ? `/uploads/jobs/${req.file.filename}`
      : null;

    const jobPosting = await JobPosting.create(
      {
        title,
        description,
        requirements: requirementsText,
        industry,
        salary_min,
        salary_max,
        location,
        form_type,
        external_form_url,
        job_image_url: jobImageUrl,
        is_anonymous: normalizedIsAnonymous,
        is_remote: normalizedIsRemote,
        company_id: company.company_id,
        status: "open",
      },
      { transaction: t }
    );

    if (form_type === "internal_form") {
      const validation = normalizeFormFields(parsedFormFields);
      if (validation.error) {
        await t.rollback();
        return res.status(400).json({ message: validation.error });
      }
      const jobForm = await JobForm.create(
        {
          job_id: jobPosting.job_id,
          require_cv: normalizedRequireCv,
        },
        { transaction: t }
      );

      if (validation.fields.length > 0) {
        const formFieldsData = validation.fields.map((field) => ({
          title: field.title,
          description: field.description,
          is_required: field.is_required,
          input_type: field.input_type,
          options: field.options,
          form_id: jobForm.form_id,
        }));
        await JobFormField.bulkCreate(formFieldsData, {
          transaction: t,
        });
      }
    }

    await t.commit();
    return successResponse(res, jobPosting, "تم إنشاء إعلان التوظيف بنجاح", 201);
  } catch (error) {
    await t.rollback();
    console.error("Error creating job posting:", error);
    return res.status(500).json({
      message: "فشل في إنشاء إعلان التوظيف",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] عرض إعلانات التوظيف للشركة
 * @route GET /api/companies/company/job-postings
 * @access Private (Company)
 */
exports.getCompanyJobPostings = async (req, res) => {
  try {
    const company = req.company;
    
    const jobPostings = await JobPosting.findAll({
      where: { company_id: company.company_id },
      include: [
        {
          model: JobForm,
          include: [JobFormField]
        },
        {
          model: Application,
          attributes: ['application_id', 'status', 'submitted_at']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return successResponse(res, jobPostings);
  } catch (error) {
    console.error("Error getting company job postings:", error);
    return res.status(500).json({ 
      message: "فشل في جلب إعلانات التوظيف", 
      error: error.message 
    });
  }
};

/**
 * @desc [Company] تعديل إعلان توظيف
 * @route PUT /api/companies/company/job-postings/:id
 * @access Private (Company)
 */
exports.updateJobPosting = async (req, res) => {
  try {
    const company = req.company;
    const jobId = req.params.id;
    const updateData = req.body;

    // التحقق من ملكية الإعلان للشركة
    const jobPosting = await JobPosting.findOne({
      where: { job_id: jobId, company_id: company.company_id }
    });

    if (!jobPosting) {
      return res.status(404).json({ message: "إعلان التوظيف غير موجود" });
    }

    // الحقول المسموح بتعديلها
    const allowedUpdates = [
      'title',
      'description',
      'requirements',
      'industry',
      'salary_min',
      'salary_max',
      'location',
      'external_form_url',
      'job_image_url',
      'is_anonymous',
      'is_remote',
    ];
    
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === "is_anonymous" || field === "is_remote") {
          filteredUpdates[field] = String(updateData[field]).toLowerCase() === "true" || updateData[field] === true;
        } else {
          filteredUpdates[field] = updateData[field];
        }
      }
    });

    if (req.file) {
      const jobImageUrl = `/uploads/jobs/${req.file.filename}`;
      if (jobPosting.job_image_url) {
        const existingPath = String(jobPosting.job_image_url || "").replace(/^\/+/, "");
        const fullPath = path.join(__dirname, "..", "..", existingPath);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, () => {});
        }
      }
      filteredUpdates.job_image_url = jobImageUrl;
    }

    await jobPosting.update(filteredUpdates);

    return successResponse(res, jobPosting, "تم تحديث إعلان التوظيف بنجاح");
  } catch (error) {
    console.error("Error updating job posting:", error);
    return res.status(500).json({ 
      message: "فشل في تحديث إعلان التوظيف", 
      error: error.message 
    });
  }
};

/**
 * @desc [Company] Recalculate AI insights for all applications in a job
 * @route POST /api/companies/company/job-postings/:id/recalculate-insights
 * @access Private (Company)
 */
exports.recalculateJobInsights = async (req, res) => {
  try {
    const company = req.company;
    const jobId = req.params.id;

    const jobPosting = await JobPosting.findOne({
      where: { job_id: jobId, company_id: company.company_id },
    });

    if (!jobPosting) {
      return res.status(404).json({ message: "Job posting not found." });
    }

    const applications = await Application.findAll({
      where: { job_id: jobId },
      include: [
        {
          model: CV,
          attributes: ["cv_id", "file_url", "title", "file_type"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    const jobDescription = [jobPosting.description, jobPosting.requirements]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    setImmediate(async () => {
      for (const application of applications) {
        const data = application.toJSON ? application.toJSON() : application;
        const cv = data.CV;
        if (!cv?.file_url) continue;

        const rawPath = String(cv.file_url);
        const backendRoot = path.join(__dirname, "..", "..");
        const normalized = rawPath.replace(/^\/+/, "");
        const filePath = path.isAbsolute(rawPath)
          ? rawPath
          : path.join(backendRoot, normalized);

        if (!fs.existsSync(filePath)) {
          continue;
        }

        const fileObj = {
          path: filePath,
          originalname: cv.title || `cv_${cv.cv_id}`,
          mimetype: cv.file_type || "application/pdf",
        };

        try {
          const aiResult = await aiService.analyzeCVFile(
            data.user_id,
            fileObj,
            true,
            { job_description: jobDescription }
          );

          if (aiResult?.ai_intelligence) {
            const existing = await CVAIInsights.findOne({
              where: { cv_id: cv.cv_id, job_id: jobPosting.job_id },
            });

            const payload = {
              ai_intelligence: aiResult.ai_intelligence,
              ats_score: aiResult.ats_score ?? null,
              industry_ranking_score: aiResult.industry_ranking_score ?? null,
              industry_ranking_label: aiResult.industry_ranking_label ?? null,
              cleaned_job_description: aiResult.cleaned_job_description ?? null,
              analysis_method: aiResult.analysis_method ?? null,
              updated_at: new Date(),
            };

            if (existing) {
              await existing.update(payload);
            } else {
              await CVAIInsights.create({
                cv_id: cv.cv_id,
                job_id: jobPosting.job_id,
                ...payload,
                created_at: new Date(),
              });
            }
          }
        } catch (error) {
          console.error("Bulk AI refresh failed:", error);
        }
      }
    });

    return successResponse(
      res,
      { job_id: jobId, queued: applications.length },
      "AI insights refresh started."
    );
  } catch (error) {
    console.error("Error recalculating job insights:", error);
    return res.status(500).json({
      message: "Failed to recalculate insights.",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] تغيير حالة إعلان التوظيف (فتح/إغلاق)
 * @route PUT /api/companies/company/job-postings/:id/toggle
 * @access Private (Company)
 */
exports.toggleJobPostingStatus = async (req, res) => {
  try {
    const company = req.company;
    const jobId = req.params.id;

    const jobPosting = await JobPosting.findOne({
      where: { job_id: jobId, company_id: company.company_id }
    });

    if (!jobPosting) {
      return res.status(404).json({ message: "إعلان التوظيف غير موجود" });
    }

    const newStatus = jobPosting.status === 'open' ? 'closed' : 'open';
    await jobPosting.update({ status: newStatus });

    return successResponse(res, 
      { ...jobPosting.toJSON(), status: newStatus }, 
      `تم ${newStatus === 'open' ? 'فتح' : 'إغلاق'} إعلان التوظيف بنجاح`
    );
  } catch (error) {
    console.error("Error toggling job posting status:", error);
    return res.status(500).json({ 
      message: "فشل في تغيير حالة الإعلان", 
      error: error.message 
    });
  }
};

/**
 * @desc [Company] إنشاء فورم داخلي لوظيفة
 * @route POST /api/companies/company/job-forms
 * @access Private (Company)
 */
exports.createJobForm = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const company = req.company;
    const { job_id, require_cv = true, fields = [] } = req.body;

    // التحقق من ملكية الوظيفة للشركة
    const jobPosting = await JobPosting.findOne({
      where: { job_id, company_id: company.company_id }
    });

    if (!jobPosting) {
      await t.rollback();
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    // إنشاء النموذج
    const validation = normalizeFormFields(fields);
    if (validation.error) {
      await t.rollback();
      return res.status(400).json({ message: validation.error });
    }

    const jobForm = await JobForm.create({
      job_id,
      require_cv
    }, { transaction: t });

    // إنشاء حقول النموذج
    if (validation.fields.length > 0) {
      const formFieldsData = validation.fields.map((field) => ({
        title: field.title,
        description: field.description,
        is_required: field.is_required,
        input_type: field.input_type,
        options: field.options,
        form_id: jobForm.form_id,
      }));
      await JobFormField.bulkCreate(formFieldsData, { transaction: t });
    }

    await t.commit();
    return successResponse(res, jobForm, "تم إنشاء النموذج بنجاح", 201);
  } catch (error) {
    await t.rollback();
    console.error("Error creating job form:", error);
    return res.status(500).json({ 
      message: "فشل في إنشاء النموذج", 
      error: error.message 
    });
  }
};

/**
 * @desc [Company] تعديل فورم التقديم (استبدال كامل)
 * @route PUT /api/companies/company/job-postings/:id/form
 * @access Private (Company)
 */
exports.updateJobForm = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const company = req.company;
    const jobId = req.params.id;
    const { require_cv = true, fields = [] } = req.body;

    // التحقق من ملكية الوظيفة
    const jobPosting = await JobPosting.findOne({
      where: {
        job_id: jobId,
        company_id: company.company_id,
      },
      include: [JobForm],
      transaction: t,
    });

    if (!jobPosting) {
      await t.rollback();
      return res.status(404).json({
        message: "إعلان التوظيف غير موجود أو لا يخص هذه الشركة",
      });
    }

    if (jobPosting.form_type !== "internal_form") {
      await t.rollback();
      return res.status(400).json({
        message: "هذه الوظيفة لا تستخدم نموذجاً داخلياً",
      });
    }

    if (!jobPosting.JobForm) {
      await t.rollback();
      return res.status(404).json({
        message: "لا يوجد نموذج مرتبط بهذه الوظيفة",
      });
    }

    const jobForm = jobPosting.JobForm;

      const validation = normalizeFormFields(fields);
      if (validation.error) {
        await t.rollback();
        return res.status(400).json({ message: validation.error });
      }

    // تحديث require_cv
    await jobForm.update({ require_cv }, { transaction: t });

    // حذف الحقول القديمة
    await JobFormField.destroy({
      where: { form_id: jobForm.form_id },
      transaction: t,
    });

    // إنشاء الحقول الجديدة
    if (validation.fields.length > 0) {
      const newFields = validation.fields.map((field) => ({
        title: field.title,
        description: field.description,
        is_required: field.is_required,
        input_type: field.input_type,
        options: field.options,
        form_id: jobForm.form_id,
      }));

      await JobFormField.bulkCreate(newFields, { transaction: t });
    }

    await t.commit();

    return successResponse(
      res,
      null,
      "تم تحديث نموذج التقديم بنجاح"
    );
  } catch (error) {
    await t.rollback();
    console.error("Error updating job form:", error);
    return res.status(500).json({
      message: "فشل في تحديث نموذج التقديم",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] حذف فورم التقديم بالكامل
 * @route DELETE /api/companies/company/job-postings/:id/form
 * @access Private (Company)
 */
exports.deleteJobForm = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const company = req.company;
    const jobId = req.params.id;

    const jobPosting = await JobPosting.findOne({
      where: {
        job_id: jobId,
        company_id: company.company_id,
      },
      include: [JobForm],
      transaction: t,
    });

    if (!jobPosting || !jobPosting.JobForm) {
      await t.rollback();
      return res.status(404).json({
        message: "نموذج التقديم غير موجود",
      });
    }

    const jobForm = jobPosting.JobForm;
// حذف الحقول
    await JobFormField.destroy({
      where: { form_id: jobForm.form_id },
      transaction: t,
    });

    // حذف الفورم
    await jobForm.destroy({ transaction: t });

    await t.commit();

    return successResponse(
      res,
      null,
      "تم حذف نموذج التقديم بنجاح"
    );
  } catch (error) {
    await t.rollback();
    console.error("Error deleting job form:", error);
    return res.status(500).json({
      message: "فشل في حذف نموذج التقديم",
      error: error.message,
    });
  }
};

/**
 * @desc [Company] حذف إعلان توظيف
 * @route DELETE /api/companies/company/job-postings/:id
 * @access Private (Company)
 */
exports.deleteJobPosting = async (req, res) => {
  try {
    const company = req.company;
    const jobId = req.params.id;

    const jobPosting = await JobPosting.findOne({
      where: {
        job_id: jobId,
        company_id: company.company_id,
      },
    });

    if (!jobPosting) {
      return res.status(404).json({
        message: "إعلان التوظيف غير موجود أو لا يخص هذه الشركة",
      });
    }

    await jobPosting.destroy();

    return successResponse(
      res,
      null,
      "تم حذف إعلان التوظيف بنجاح"
    );
  } catch (error) {
    console.error("Error deleting job posting:", error);
    return res.status(500).json({
      message: "فشل في حذف إعلان التوظيف",
      error: error.message,
    });
  }
};
