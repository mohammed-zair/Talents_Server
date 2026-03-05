const {
  CompanyCVRequest,
  CompanyCVDelivery,
  CompanyCVRequestCandidate,
  Company,
  User,
  CV,
  CVFeaturesAnalytics,
  CVStructuredData,
  CVAIInsights,
  JobPosting,
  PushNotification,
  EmailNotification,
} = require("../../models");
const { Op } = require("sequelize");
const sendPushUtil = require("../../utils/sendPush");
const sendEmail = require("../../utils/sendEmail");

const REQUEST_STATUS_ALLOWED = [
  "pending",
  "approved",
  "rejected",
  "processing",
  "processed",
  "delivered",
  "closed",
];

const CANDIDATE_STATUS_ALLOWED = [
  "selected",
  "contacting",
  "submitted_to_company",
  "accepted_by_company",
  "rejected_by_company",
];

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseJsonMaybe = (value) => {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const str = (value) => String(value || "").trim();

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => str(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeLanguage = (value) =>
  String(value || "").toLowerCase().startsWith("ar") ? "ar" : "en";

const extractCvFeatures = (cv) =>
  cv?.CVFeaturesAnalytics || cv?.CV_Features_Analytics || cv?.CV_Features_Analytic || null;

const extractCvStructured = (cv) =>
  cv?.CVStructuredData || cv?.CV_Structured_Data || cv?.CV_Structured_Datum || null;

const extractCvInsights = (cv) =>
  cv?.CVAIInsights || cv?.CV_AI_Insights || cv?.CVAIInsight || [];

const normalizeSkill = (skill) => str(skill).toLowerCase().replace(/[\s._-]+/g, "");

const getBestInsight = (insights = [], request = null) => {
  if (!Array.isArray(insights) || insights.length === 0) return null;
  const sorted = [...insights].sort((a, b) => Number(b?.insight_id || 0) - Number(a?.insight_id || 0));
  if (request?.job_id) {
    const jobSpecific = sorted.find((item) => Number(item?.job_id) === Number(request.job_id));
    if (jobSpecific) return jobSpecific;
  }
  const generic = sorted.find((item) => item?.job_id == null);
  return generic || sorted[0] || null;
};

const mapCandidateRow = (user, request = null) => {
  const cvs = Array.isArray(user?.CVs) ? user.CVs : [];
  if (cvs.length === 0) return null;

  const sortedCvs = [...cvs].sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
  const cv = sortedCvs[0];

  const features = extractCvFeatures(cv);
  const structured = parseJsonMaybe(extractCvStructured(cv)?.data_json) || {};
  const insights = extractCvInsights(cv);
  const selectedInsight = getBestInsight(insights, request);
  const aiIntel = parseJsonMaybe(selectedInsight?.ai_intelligence) || {};

  const personalInfo = structured?.personal_info || {};
  const profileLocation = str(personalInfo.location || structured?.location || "");
  const skillPool = normalizeList(features?.key_skills)
    .concat(normalizeList(structured?.skills))
    .filter(Boolean);
  const uniqueSkillPool = Array.from(new Set(skillPool.map((item) => str(item))));
  const strengths = normalizeList(aiIntel?.strengths || aiIntel?.strategic_analysis?.strengths);
  const weaknesses = normalizeList(aiIntel?.weaknesses || aiIntel?.strategic_analysis?.weaknesses);

  const atsScore = toNum(features?.ats_score);
  const aiScoreRaw = toNum(selectedInsight?.industry_ranking_score ?? selectedInsight?.ats_score);
  const aiScore = aiScoreRaw !== null && aiScoreRaw <= 1 ? Number((aiScoreRaw * 100).toFixed(2)) : aiScoreRaw;
  const cvPower = atsScore ?? aiScore ?? 0;

  return {
    user_id: user.user_id,
    full_name: user.full_name || "Candidate",
    email: user.email || null,
    phone: user.phone || null,
    cv_id: cv.cv_id,
    cv_title: cv.title || null,
    cv_file_url: cv.file_url || null,
    cv_created_at: cv.created_at || null,
    location: profileLocation || null,
    total_years_experience: toNum(features?.total_years_experience) ?? 0,
    education: Array.isArray(structured?.education) ? structured.education : [],
    skills: uniqueSkillPool,
    candidate_ats_score: atsScore,
    candidate_ai_score: aiScore,
    cv_power: cvPower,
    ai_strengths: strengths,
    ai_weaknesses: weaknesses,
    industry_ranking_label: str(selectedInsight?.industry_ranking_label || ""),
    ai_summary: str(aiIntel?.contextual_summary || aiIntel?.professional_summary || ""),
    ai_intelligence: aiIntel,
    selected_insight_id: selectedInsight?.insight_id || null,
  };
};

const matchesKeywordList = (list, query) => {
  if (!query) return true;
  const needle = str(query).toLowerCase();
  if (!needle) return true;
  return (Array.isArray(list) ? list : []).some((item) => str(item).toLowerCase().includes(needle));
};

const applyCandidateFilters = (rows, filters) => {
  const {
    search,
    cv_power_min,
    cv_power_max,
    skills,
    experience_min,
    experience_max,
    education_level,
    location,
    ai_strengths,
    ai_weaknesses,
    sort = "cv_power_desc",
  } = filters;

  const skillNeedles = normalizeList(skills).map(normalizeSkill);
  const searchNeedle = str(search).toLowerCase();
  const locationNeedle = str(location).toLowerCase();
  const educationNeedle = str(education_level).toLowerCase();
  const minPower = toNum(cv_power_min);
  const maxPower = toNum(cv_power_max);
  const minExp = toNum(experience_min);
  const maxExp = toNum(experience_max);

  const filtered = rows.filter((row) => {
    if (searchNeedle) {
      const searchBlob = [row.full_name, row.email, row.cv_title, row.location, row.industry_ranking_label]
        .map((item) => str(item).toLowerCase())
        .join(" ");
      if (!searchBlob.includes(searchNeedle)) return false;
    }

    if (minPower !== null && Number(row.cv_power || 0) < minPower) return false;
    if (maxPower !== null && Number(row.cv_power || 0) > maxPower) return false;

    if (minExp !== null && Number(row.total_years_experience || 0) < minExp) return false;
    if (maxExp !== null && Number(row.total_years_experience || 0) > maxExp) return false;

    if (skillNeedles.length > 0) {
      const rowSkills = (row.skills || []).map(normalizeSkill);
      const hasAll = skillNeedles.every((needle) => rowSkills.some((skill) => skill.includes(needle)));
      if (!hasAll) return false;
    }

    if (locationNeedle) {
      const rowLocation = str(row.location).toLowerCase();
      if (!rowLocation.includes(locationNeedle)) return false;
    }

    if (educationNeedle) {
      const educations = Array.isArray(row.education) ? row.education : [];
      const found = educations.some((edu) => {
        const blob = `${str(edu?.degree)} ${str(edu?.field_of_study)} ${str(edu?.institution)}`.toLowerCase();
        return blob.includes(educationNeedle);
      });
      if (!found) return false;
    }

    if (!matchesKeywordList(row.ai_strengths, ai_strengths)) return false;
    if (!matchesKeywordList(row.ai_weaknesses, ai_weaknesses)) return false;

    return true;
  });

  const sortHandlers = {
    latest: (a, b) => new Date(b.cv_created_at || 0) - new Date(a.cv_created_at || 0),
    oldest: (a, b) => new Date(a.cv_created_at || 0) - new Date(b.cv_created_at || 0),
    cv_power_desc: (a, b) => Number(b.cv_power || 0) - Number(a.cv_power || 0),
    cv_power_asc: (a, b) => Number(a.cv_power || 0) - Number(b.cv_power || 0),
    name_asc: (a, b) => str(a.full_name).localeCompare(str(b.full_name)),
  };

  const sorter = sortHandlers[sort] || sortHandlers.cv_power_desc;
  return filtered.sort(sorter);
};

const buildAiSnapshot = (candidate) => ({
  summary: candidate.ai_summary || null,
  strengths: candidate.ai_strengths || [],
  weaknesses: candidate.ai_weaknesses || [],
  industry_ranking_label: candidate.industry_ranking_label || null,
  ats_score: candidate.candidate_ats_score,
  cv_power: candidate.cv_power,
});

const composeStatusTemplates = ({ language, request, candidates, customIntro, messageType }) => {
  const role = str(request?.requested_role || "position");
  const companyName = str(request?.Company?.name || "Company");

  const defaultIntroEn =
    "We found the best candidate for this position. Hiring is in progress. We will send the candidate to you as soon as possible.";
  const defaultIntroAr =
    "????? ???? ???? ???? ??????. ????? ??????? ??? ???????? ??????? ??? ?? ???? ??? ????.";

  const intro = str(customIntro) || (language === "ar" ? defaultIntroAr : defaultIntroEn);

  const candidateLines = candidates.map((item, index) => {
    const score = toNum(item.candidate_ats_score ?? item.cv_power);
    const scoreLabel = score === null ? "-" : String(score);
    const why = str(item.why_candidate || item.notes || item.ai_summary || "");
    if (language === "ar") {
      return `${index + 1}. ${item.full_name} - ATS: ${scoreLabel}\n??? ????????: ${why || "???? ??? ??? ????? ???? ???????."}`;
    }
    return `${index + 1}. ${item.full_name} - ATS: ${scoreLabel}\nWhy this candidate: ${why || "Strong fit based on HR review."}`;
  });

  const subject =
    language === "ar"
      ? `????? ??? Headhunt - ${role}`
      : `Headhunt Request Update - ${role}`;

  const textBody =
    language === "ar"
      ? `?????? ${companyName},\n\n${intro}\n\n???????: ${role}\n???? ???????: ${messageType}\n\n${candidateLines.join("\n\n")}\n\n???? Talents`
      : `Hello ${companyName},\n\n${intro}\n\nRole: ${role}\nUpdate type: ${messageType}\n\n${candidateLines.join("\n\n")}\n\nTalents Team`;

  const htmlCandidateCards = candidates
    .map((item, index) => {
      const score = toNum(item.candidate_ats_score ?? item.cv_power);
      const scoreLabel = score === null ? "-" : String(score);
      const why = str(item.why_candidate || item.notes || item.ai_summary || "");
      const skills = normalizeList(item.skills).slice(0, 6).join(" • ");

      if (language === "ar") {
        return `
          <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;background:#f9fafb;" dir="rtl">
            <div style="font-weight:700;color:#111827;">${index + 1}. ${item.full_name}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:4px;">ATS: ${scoreLabel}</div>
            <div style="font-size:13px;color:#374151;margin-top:6px;"><strong>??? ????????:</strong> ${why || "???? ????? ??? ????? ???? ??????? ???????."}</div>
            ${skills ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${skills}</div>` : ""}
          </div>
        `;
      }

      return `
        <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;background:#f9fafb;">
          <div style="font-weight:700;color:#111827;">${index + 1}. ${item.full_name}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">ATS: ${scoreLabel}</div>
          <div style="font-size:13px;color:#374151;margin-top:6px;"><strong>Why this candidate:</strong> ${why || "Strong candidate based on HR review."}</div>
          ${skills ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${skills}</div>` : ""}
        </div>
      `;
    })
    .join("");

  const htmlBody =
    language === "ar"
      ? `
      <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;" dir="rtl">
        <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937);color:#fff;padding:20px;">
            <h2 style="margin:0;">????? Headhunt</h2>
            <p style="margin:8px 0 0;opacity:.9;">${role}</p>
          </div>
          <div style="padding:20px;color:#111827;">
            <p style="margin:0 0 12px;">${intro}</p>
            <p style="margin:0 0 12px;color:#374151;">??? ???????: ${messageType}</p>
            ${htmlCandidateCards || "<p>?? ???? ?????? ?????? ??????.</p>"}
            <p style="margin-top:14px;color:#6b7280;">???? Talents</p>
          </div>
        </div>
      </div>
    `
      : `
      <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
        <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#0f172a,#1f2937);color:#fff;padding:20px;">
            <h2 style="margin:0;">Headhunt Pipeline Update</h2>
            <p style="margin:8px 0 0;opacity:.9;">${role}</p>
          </div>
          <div style="padding:20px;color:#111827;">
            <p style="margin:0 0 12px;">${intro}</p>
            <p style="margin:0 0 12px;color:#374151;">Update type: ${messageType}</p>
            ${htmlCandidateCards || "<p>No candidate data available yet.</p>"}
            <p style="margin-top:14px;color:#6b7280;">Talents Team</p>
          </div>
        </div>
      </div>
    `;

  return { intro, subject, textBody, htmlBody };
};

exports.getAllCVRequests = async (req, res) => {
  try {
    const requests = await CompanyCVRequest.findAll({
      include: [{ model: Company, attributes: ["company_id", "name", "email"] }],
      order: [["created_at", "DESC"]],
    });

    const requestIds = requests.map((item) => item.request_id);
    const candidateRows = requestIds.length
      ? await CompanyCVRequestCandidate.findAll({
          attributes: ["request_id", "status"],
          where: { request_id: { [Op.in]: requestIds } },
        })
      : [];

    const counters = candidateRows.reduce((acc, row) => {
      const key = Number(row.request_id);
      if (!acc[key]) {
        acc[key] = {
          total_candidates: 0,
          submitted_to_company: 0,
          accepted_by_company: 0,
          rejected_by_company: 0,
        };
      }
      acc[key].total_candidates += 1;
      if (row.status && acc[key][row.status] !== undefined) {
        acc[key][row.status] += 1;
      }
      return acc;
    }, {});

    const data = requests.map((row) => {
      const request = row.toJSON();
      return {
        ...request,
        requested_role: request.requested_role || "-",
        skills: normalizeList(request.skills),
        stats: counters[request.request_id] || {
          total_candidates: 0,
          submitted_to_company: 0,
          accepted_by_company: 0,
          rejected_by_company: 0,
        },
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getAllCVRequests error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getHeadhuntRequestById = async (req, res) => {
  try {
    const request = await CompanyCVRequest.findByPk(req.params.id, {
      include: [{ model: Company, attributes: ["company_id", "name", "email"] }],
    });
    if (!request) return res.status(404).json({ message: "Request not found" });

    const candidates = await CompanyCVRequestCandidate.findAll({
      where: { request_id: request.request_id },
      attributes: ["id", "status"],
    });

    const aggregate = {
      total_candidates: candidates.length,
      selected: 0,
      contacting: 0,
      submitted_to_company: 0,
      accepted_by_company: 0,
      rejected_by_company: 0,
    };

    for (const row of candidates) {
      if (aggregate[row.status] !== undefined) aggregate[row.status] += 1;
    }

    return res.json({
      success: true,
      data: {
        ...request.toJSON(),
        skills: normalizeList(request.skills),
        aggregate,
      },
    });
  } catch (error) {
    console.error("getHeadhuntRequestById error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = status === "processed" ? "processing" : status;
    if (!REQUEST_STATUS_ALLOWED.includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await CompanyCVRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = normalizedStatus;
    await request.save();

    return res.json({
      success: true,
      message: "Request status updated",
      data: request,
    });
  } catch (error) {
    console.error("updateStatus error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getCandidateFeed = async (req, res) => {
  try {
    const request = await CompanyCVRequest.findByPk(req.params.id, {
      include: [{ model: Company, attributes: ["company_id", "name", "email"] }],
    });
    if (!request) return res.status(404).json({ message: "Request not found" });

    const seekers = await User.findAll({
      where: { user_type: "seeker", is_deleted: false },
      attributes: ["user_id", "full_name", "email", "phone"],
      include: [
        {
          model: CV,
          required: true,
          include: [
            { model: CVFeaturesAnalytics, required: false },
            { model: CVStructuredData, required: false },
            { model: CVAIInsights, required: false },
          ],
        },
      ],
      order: [["user_id", "DESC"]],
    });

    const mapped = seekers.map((user) => mapCandidateRow(user, request)).filter(Boolean);
    const filtered = applyCandidateFilters(mapped, req.query || {});

    return res.json({
      success: true,
      data: {
        request: {
          request_id: request.request_id,
          company_id: request.company_id,
          requested_role: request.requested_role,
          experience_years: request.experience_years,
          skills: normalizeList(request.skills),
          location: request.location,
          cv_count: request.cv_count,
          status: request.status,
          company: request.Company || null,
        },
        total: filtered.length,
        items: filtered,
      },
    });
  } catch (error) {
    console.error("getCandidateFeed error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.listRequestCandidates = async (req, res) => {
  try {
    const request = await CompanyCVRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const rows = await CompanyCVRequestCandidate.findAll({
      where: { request_id: request.request_id },
      include: [
        { model: User, attributes: ["user_id", "full_name", "email", "phone"] },
        {
          model: CV,
          attributes: ["cv_id", "title", "file_url", "created_at"],
          include: [
            { model: CVFeaturesAnalytics, required: false },
            { model: CVStructuredData, required: false },
            { model: CVAIInsights, required: false },
          ],
          required: false,
        },
      ],
      order: [["priority_rank", "ASC"], ["created_at", "DESC"]],
    });

    const data = rows.map((row) => {
      const candidate = row.toJSON();
      const cvSummary = candidate.CV ? mapCandidateRow({ ...candidate.User, CVs: [candidate.CV] }, request) : null;
      return {
        ...candidate,
        candidate_profile: cvSummary,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("listRequestCandidates error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.addRequestCandidate = async (req, res) => {
  try {
    const request = await CompanyCVRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const adminId = req.user?.user_id || null;
    const userId = toNum(req.body?.user_id);
    const cvId = toNum(req.body?.cv_id);
    const jobId = toNum(req.body?.job_id);

    if (!userId) return res.status(400).json({ message: "user_id is required" });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Candidate user not found" });

    const existing = await CompanyCVRequestCandidate.findOne({
      where: { request_id: request.request_id, user_id: userId, cv_id: cvId || null },
    });
    if (existing) {
      return res.json({
        success: true,
        message: "Candidate already exists for this request",
        data: existing,
      });
    }

    const status = CANDIDATE_STATUS_ALLOWED.includes(req.body?.status)
      ? req.body.status
      : "selected";

    const candidate = await CompanyCVRequestCandidate.create({
      request_id: request.request_id,
      user_id: userId,
      cv_id: cvId,
      job_id: jobId,
      status,
      priority_rank: toNum(req.body?.priority_rank),
      why_candidate: str(req.body?.why_candidate) || null,
      source_ai_snapshot: parseJsonMaybe(req.body?.source_ai_snapshot) || null,
      notes: str(req.body?.notes) || null,
      created_by_admin_id: adminId,
      updated_by_admin_id: adminId,
    });

    return res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    console.error("addRequestCandidate error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.updateRequestCandidate = async (req, res) => {
  try {
    const request = await CompanyCVRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const candidate = await CompanyCVRequestCandidate.findOne({
      where: { id: req.params.candidateId, request_id: request.request_id },
    });

    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const nextStatus = req.body?.status;
    if (nextStatus && !CANDIDATE_STATUS_ALLOWED.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid candidate status" });
    }

    if (nextStatus === "submitted_to_company" && request.status !== "processing") {
      return res
        .status(400)
        .json({ message: "Cannot submit candidate while request is not in processing state" });
    }

    const patch = {
      updated_by_admin_id: req.user?.user_id || null,
      updated_at: new Date(),
    };

    if (nextStatus) patch.status = nextStatus;
    if (req.body?.priority_rank !== undefined) patch.priority_rank = toNum(req.body.priority_rank);
    if (req.body?.notes !== undefined) patch.notes = str(req.body.notes) || null;
    if (req.body?.why_candidate !== undefined) patch.why_candidate = str(req.body.why_candidate) || null;
    if (req.body?.source_ai_snapshot !== undefined) {
      patch.source_ai_snapshot = parseJsonMaybe(req.body.source_ai_snapshot) || null;
    }

    await candidate.update(patch);

    if (nextStatus === "submitted_to_company" && candidate.cv_id) {
      const existingDelivery = await CompanyCVDelivery.findOne({
        where: { request_id: request.request_id, cv_id: candidate.cv_id },
      });
      if (!existingDelivery) {
        await CompanyCVDelivery.create({
          request_id: request.request_id,
          cv_id: candidate.cv_id,
          match_score: toNum(req.body?.match_score) || 0,
          match_details: {
            source: "admin_headhunt_pipeline",
            candidate_id: candidate.id,
            why_candidate: candidate.why_candidate || null,
          },
        });
      }
    }

    return res.json({ success: true, data: candidate });
  } catch (error) {
    console.error("updateRequestCandidate error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.sendCompanyUpdate = async (req, res) => {
  const adminId = req.user?.user_id || null;

  try {
    const request = await CompanyCVRequest.findByPk(req.params.id, {
      include: [{ model: Company, attributes: ["company_id", "name", "email", "preferred_language"] }],
    });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (!request.Company) return res.status(404).json({ message: "Company not found for this request" });

    const payloadLanguage = req.body?.language;
    const language = normalizeLanguage(payloadLanguage || request.Company?.preferred_language || "en");
    const messageType = str(req.body?.message_type || "progress_update") || "progress_update";
    const includeWhy = req.body?.include_why_candidate !== false;

    const candidateIds = Array.isArray(req.body?.candidate_ids)
      ? req.body.candidate_ids.map((item) => Number(item)).filter((item) => Number.isFinite(item))
      : [];

    const candidateWhere = { request_id: request.request_id };
    if (candidateIds.length > 0) {
      candidateWhere.id = { [Op.in]: candidateIds };
    } else {
      candidateWhere.status = { [Op.in]: ["selected", "contacting", "submitted_to_company"] };
    }

    const candidateRows = await CompanyCVRequestCandidate.findAll({
      where: candidateWhere,
      include: [
        { model: User, attributes: ["user_id", "full_name", "email"] },
        {
          model: CV,
          attributes: ["cv_id"],
          include: [{ model: CVFeaturesAnalytics, required: false }],
          required: false,
        },
      ],
      order: [["priority_rank", "ASC"], ["created_at", "DESC"]],
      limit: 5,
    });

    const candidates = candidateRows.map((row) => {
      const data = row.toJSON();
      const ats = toNum(data.CV?.CVFeaturesAnalytics?.ats_score);
      const snapshot = parseJsonMaybe(data.source_ai_snapshot) || {};
      return {
        id: data.id,
        full_name: data.User?.full_name || "Candidate",
        candidate_ats_score: ats,
        cv_power: ats,
        why_candidate: includeWhy
          ? str(data.why_candidate) || str(snapshot.summary) || null
          : null,
        ai_summary: str(snapshot.summary) || null,
        skills: normalizeList(snapshot.skills),
        notes: data.notes || null,
      };
    });

    const templates = composeStatusTemplates({
      language,
      request,
      candidates,
      customIntro: req.body?.custom_intro,
      messageType,
    });

    const pushTarget = await User.findOne({
      where: {
        company_id: request.Company.company_id,
        user_type: { [Op.in]: ["company", "admin"] },
        is_deleted: false,
      },
      order: [["user_id", "ASC"]],
    });

    let pushRecord = null;
    if (pushTarget) {
      let isSent = false;
      try {
        isSent = await sendPushUtil(pushTarget.user_id, "Headhunt Pipeline Update", templates.intro);
      } catch (error) {
        isSent = false;
      }

      pushRecord = await PushNotification.create({
        user_id: pushTarget.user_id,
        title: "Headhunt Pipeline Update",
        message: templates.intro,
        is_sent: isSent,
        sent_at: isSent ? new Date() : null,
      });
    }

    let isEmailSent = false;
    try {
      await sendEmail(request.Company.email, templates.subject, templates.textBody, {
        html: templates.htmlBody,
      });
      isEmailSent = true;
    } catch (error) {
      isEmailSent = false;
    }

    const emailRecord = await EmailNotification.create({
      company_id: request.Company.company_id,
      recipient_email: request.Company.email,
      subject: templates.subject,
      body: templates.textBody,
      status: isEmailSent ? "sent" : "failed",
      sent_at: isEmailSent ? new Date() : null,
    });

    return res.json({
      success: true,
      data: {
        success: true,
        push_notification_id: pushRecord?.push_id || null,
        email_notification_id: emailRecord?.email_id || null,
        delivered_to_company_id: request.Company.company_id,
      },
    });
  } catch (error) {
    console.error("sendCompanyUpdate error:", error);
    return res.status(500).json({ message: "Failed to send company update", error: error.message });
  }
};
