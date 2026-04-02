const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const aiService = require("./aiService");
const {
  Application,
  CV,
  CVStructuredData,
  CVFeaturesAnalytics,
  CVAIInsights,
} = require("../models");

const activeAnalysisJobs = new Set();

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const hasNonEmptyValue = (value) => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((entry) => hasNonEmptyValue(entry));
  if (isObject(value)) return Object.values(value).some((entry) => hasNonEmptyValue(entry));
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "boolean") return value;
  return false;
};

const hasMeaningfulStructuredData = (structuredData) => {
  if (!isObject(structuredData)) return false;
  const criticalSections = [
    structuredData.personal_info,
    structuredData.summary,
    structuredData.skills,
    structuredData.experience,
    structuredData.education,
    structuredData.projects,
  ];
  return criticalSections.some((section) => hasNonEmptyValue(section));
};

const normalizeAiIntelligence = (raw) => {
  if (typeof raw === "string") {
    try {
      return normalizeAiIntelligence(JSON.parse(raw));
    } catch (error) {
      return raw;
    }
  }
  if (!raw || typeof raw !== "object") return raw;
  const strategic = raw.strategic_analysis || {};
  const strengths = raw.strengths || strategic.strengths || [];
  const weaknesses = raw.weaknesses || strategic.weaknesses || [];
  const recommendations = raw.recommendations || raw.ats_optimization_tips || [];
  const summary = raw.contextual_summary || raw.professional_summary || raw.summary || null;
  return {
    ...raw,
    strengths,
    weaknesses,
    recommendations,
    summary,
  };
};

const normalizeFeaturesFromAnalysis = (analysisResult) => {
  const raw = analysisResult?.features || analysisResult?.features_analytics || {};
  return isObject(raw) ? raw : {};
};

const buildFeaturesPayload = (cvId, features, atsScore, structuredData) => {
  const hasEducation =
    typeof features.has_education === "boolean"
      ? features.has_education
      : Array.isArray(structuredData?.education) && structuredData.education.length > 0;
  const hasExperience =
    typeof features.has_experience === "boolean"
      ? features.has_experience
      : Array.isArray(structuredData?.experience) && structuredData.experience.length > 0;
  const hasContactInfo =
    typeof features.has_contact_info === "boolean"
      ? features.has_contact_info
      : hasNonEmptyValue(structuredData?.personal_info);

  return {
    cv_id: cvId,
    ats_score: Number.isFinite(Number(atsScore)) ? Number(atsScore) : 0,
    total_years_experience: Number(features.total_years_experience) || 0,
    key_skills: Array.isArray(features.key_skills) ? features.key_skills : [],
    achievement_count: Number(features.achievement_count) || 0,
    has_contact_info: hasContactInfo,
    has_education: hasEducation,
    has_experience: hasExperience,
    is_ats_compliant: Number(atsScore) >= 70,
  };
};

const getAnalysisError = (analysisResult) =>
  analysisResult?.error_message ||
  analysisResult?.error ||
  analysisResult?.message ||
  "AI analysis is temporarily unavailable.";

const buildCvFileObject = (cvRecord) => {
  if (!cvRecord?.file_url) {
    throw new Error("CV file is missing.");
  }

  const rawPath = String(cvRecord.file_url);
  const backendRoot = path.join(__dirname, "..", "..");
  const normalized = rawPath.replace(/^\/+/, "");
  const filePath = path.isAbsolute(rawPath) ? rawPath : path.join(backendRoot, normalized);

  if (!fs.existsSync(filePath)) {
    throw new Error("CV file not found on server.");
  }

  return {
    path: filePath,
    originalname: cvRecord.title || `cv_${cvRecord.cv_id}`,
    mimetype: cvRecord.file_type || "application/pdf",
  };
};

const persistAnalysisResult = async ({ application, cvRecord, analysisResult }) => {
  const structuredData = analysisResult?.structured_data || analysisResult?.structuredData || {};
  if (!hasMeaningfulStructuredData(structuredData)) {
    throw new Error(getAnalysisError(analysisResult));
  }

  const features = normalizeFeaturesFromAnalysis(analysisResult);
  const atsScore = analysisResult?.ats_score ?? analysisResult?.score ?? 0;
  const competencyMatrix = analysisResult?.competency_matrix || null;
  const rawAI = analysisResult?.ai_intelligence || analysisResult?.ai_insights || null;
  let aiIntelligence = null;

  if (rawAI) {
    const normalized = normalizeAiIntelligence(rawAI);
    if (normalized && typeof normalized === "object" && competencyMatrix) {
      normalized.competency_matrix = competencyMatrix;
    }
    aiIntelligence = normalized || (competencyMatrix ? { competency_matrix: competencyMatrix } : null);
  } else if (competencyMatrix) {
    aiIntelligence = { competency_matrix: competencyMatrix };
  }

  const featuresPayload = buildFeaturesPayload(cvRecord.cv_id, features, atsScore, structuredData);

  const structuredRecord = await CVStructuredData.findOne({ where: { cv_id: cvRecord.cv_id } });
  if (structuredRecord) {
    await structuredRecord.update({ data_json: structuredData });
  } else {
    await CVStructuredData.create({ cv_id: cvRecord.cv_id, data_json: structuredData });
  }

  const featuresRecord = await CVFeaturesAnalytics.findOne({ where: { cv_id: cvRecord.cv_id } });
  if (featuresRecord) {
    await featuresRecord.update(featuresPayload);
  } else {
    await CVFeaturesAnalytics.create(featuresPayload);
  }

  if (aiIntelligence) {
    const existingInsight = await CVAIInsights.findOne({
      where: { cv_id: cvRecord.cv_id, job_id: application.job_id },
      order: [["insight_id", "DESC"]],
    });

    const insightPayload = {
      cv_id: cvRecord.cv_id,
      job_id: application.job_id,
      ai_intelligence: aiIntelligence,
      ats_score: atsScore,
      industry_ranking_score: analysisResult?.industry_ranking_score ?? null,
      industry_ranking_label: analysisResult?.industry_ranking_label ?? null,
      cleaned_job_description: analysisResult?.cleaned_job_description || null,
      analysis_method: analysisResult?.analysis_method || analysisResult?.analysisMethod || "ai_core",
      structured_data: structuredData,
      features_analytics: featuresPayload,
      ai_raw_response: analysisResult || null,
    };

    if (existingInsight) {
      await existingInsight.update(insightPayload);
    } else {
      await CVAIInsights.create(insightPayload);
    }
  }

  await application.update({
    analysis_status: "succeeded",
    analysis_error_message: null,
    analysis_completed_at: new Date(),
  });
};

const runApplicationCvAnalysis = async ({ applicationId }) => {
  if (!applicationId || activeAnalysisJobs.has(applicationId)) return;
  activeAnalysisJobs.add(applicationId);

  try {
    const application = await Application.findByPk(applicationId);
    if (!application || !application.cv_id) return;

    const cvRecord = await CV.findByPk(application.cv_id);
    if (!cvRecord) {
      throw new Error("Linked CV was not found.");
    }

    const requestId = uuidv4();
    await application.update({
      analysis_status: "pending",
      analysis_started_at: application.analysis_started_at || new Date(),
      analysis_completed_at: null,
      analysis_error_message: null,
    });

    const fileObj = buildCvFileObject(cvRecord);
    const analysisResult = await aiService.analyzeCVFile(application.user_id, fileObj, true, {
      request_id: requestId,
    });

    await persistAnalysisResult({ application, cvRecord, analysisResult });
  } catch (error) {
    console.error("Application CV analysis failed:", error);
    try {
      const application = await Application.findByPk(applicationId);
      if (application) {
        await application.update({
          analysis_status: "failed",
          analysis_error_message: String(error?.message || "AI analysis is temporarily unavailable."),
          analysis_completed_at: new Date(),
        });
      }
    } catch (updateError) {
      console.error("Failed to update application analysis failure state:", updateError);
    }
  } finally {
    activeAnalysisJobs.delete(applicationId);
  }
};

const queueApplicationCvAnalysis = ({ applicationId }) => {
  setImmediate(() => {
    runApplicationCvAnalysis({ applicationId }).catch((error) => {
      console.error("Queued application CV analysis failed:", error);
    });
  });
};

module.exports = {
  queueApplicationCvAnalysis,
  runApplicationCvAnalysis,
};
