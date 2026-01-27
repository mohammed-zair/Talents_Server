// file: src/controllers/savedJobs.controller.js

const { SavedJob, JobPosting, Company } = require("../models");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const buildCompanyLogoUrl = (companyId) => `/api/companies/${companyId}/logo`;

const withCompanyLogoUrl = (company) => {
  if (!company) return company;
  const data = company.toJSON ? company.toJSON() : { ...company };
  const logoUrl = data.logo_mimetype
    ? buildCompanyLogoUrl(data.company_id)
    : null;
  return {
    ...data,
    logo_url: logoUrl,
    logo_mimetype: undefined,
  };
};

/**
 * @desc [Seeker] حفظ وظيفة
 * @route POST /api/jop_seeker/saved-jobs/:job_id
 * @access Private
 */
exports.saveJob = async (req, res) => {
  const { job_id } = req.params;
  const { user_id } = req.user;

  try {
    // التحقق من وجود الوظيفة
    const job = await JobPosting.findOne({
      where: { job_id, status: "open" },
    });

    if (!job) {
      return errorResponse(res, "الوظيفة غير موجودة.", null, 404);
    }

    // منع التكرار
    const existing = await SavedJob.findOne({
      where: { user_id, job_id },
    });

    if (existing) {
      return successResponse(res, null, "الوظيفة محفوظة مسبقاً.");
    }

    await SavedJob.create({ user_id, job_id });

    return successResponse(res, null, "تم حفظ الوظيفة بنجاح.");
  } catch (error) {
    console.error("Error saving job:", error);
    return errorResponse(res, "فشل في حفظ الوظيفة.", error, 500);
  }
};

/**
 * @desc [Seeker] عرض الوظائف المحفوظة
 * @route GET /api/jop_seeker/saved-jobs
 * @access Private
 */
exports.getSavedJobs = async (req, res) => {
  const { user_id } = req.user;

  try {
    const savedJobs = await SavedJob.findAll({
      where: { user_id },
      include: [
        {
          model: JobPosting,
          where: { status: "open" },
          attributes: [
            "job_id",
            "title",
            "location",
            "salary_min",
            "salary_max",
            "created_at",
          ],
          include: [
            {
              model: Company,
              attributes: ["company_id", "name", "logo_mimetype"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const payload = savedJobs.map((entry) => {
      const data = entry.toJSON ? entry.toJSON() : { ...entry };
      if (data.JobPosting?.Company) {
        data.JobPosting.Company = withCompanyLogoUrl(data.JobPosting.Company);
      }
      return data;
    });

    return successResponse(res, payload);
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    return errorResponse(res, "فشل في جلب الوظائف المحفوظة.", error, 500);
  }
};

/**
 * @desc [Seeker] إزالة وظيفة من المحفوظات
 * @route DELETE /api/jop_seeker/saved-jobs/:job_id
 * @access Private
 */
exports.removeSavedJob = async (req, res) => {
  const { job_id } = req.params;
  const { user_id } = req.user;

  try {
    const deleted = await SavedJob.destroy({
      where: { user_id, job_id },
    });

    if (!deleted) {
      return errorResponse(res, "الوظيفة غير موجودة في المحفوظات.", null, 404);
    }

    return successResponse(res, null, "تم حذف الوظيفة من المحفوظات.");
  } catch (error) {
    console.error("Error removing saved job:", error);
    return errorResponse(res, "فشل في حذف الوظيفة.", error, 500);
  }
};
