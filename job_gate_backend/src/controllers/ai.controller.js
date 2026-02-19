// file: src/controllers/ai.controller.js
const aiService = require('../services/aiService');
const { CV, CVStructuredData, CVFeaturesAnalytics, CVAIInsights, JobPosting } = require('../models');
const { successResponse } = require('../utils/responseHandler');
const { v4: uuidv4 } = require('uuid');
const path = require("path");
const fs = require("fs");
const { extractTextFromFile } = require("../utils/cvTextExtractor");

/**
 * @desc تحليل CV نصي باستخدام AI (مع Normalization وRequest ID)
 * @route POST /api/ai/cv/analyze-text
 * @access Private
 */
exports.analyzeCVText = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Start CV Analysis`);
  try {
    const { cvText, useAI = false, saveToDb = true } = req.body;
    const userId = req.user.user_id;

    if (!cvText) {
      return res.status(400).json({ message: 'نص CV مطلوب', requestId });
    }

    const analysisResult = await aiService.analyzeCVText(userId, cvText, useAI);

    // Normalization: التأكد أن البيانات دائما بشكل موحد
    const structuredData = analysisResult.structured_data || {};
    const features = analysisResult.features || {};
    const ats_score = analysisResult.ats_score ?? analysisResult.score ?? 0;
    const analysis_method = analysisResult.analysis_method || analysisResult.analysisMethod || null;
    const processing_time = analysisResult.processing_time || analysisResult.processingTime || null;
    const rawAIIntelligence = analysisResult.ai_intelligence || analysisResult.ai_insights || null;
    const competency_matrix = analysisResult.competency_matrix || null;
    const ai_intelligence = rawAIIntelligence
      ? {
          ...rawAIIntelligence,
          ...(competency_matrix ? { competency_matrix } : {}),
        }
      : competency_matrix
        ? { competency_matrix }
        : null;
    const cleaned_job_description = analysisResult.cleaned_job_description || null;
    const industry_ranking_score = analysisResult.industry_ranking_score ?? null;
    const industry_ranking_label = analysisResult.industry_ranking_label ?? null;

    if (saveToDb) {
      const cvRecord = await CV.create({
        user_id: userId,
        title: `AI Analyzed CV - ${new Date().toISOString().slice(0, 10)}`,
        file_type: 'text',
        file_url: null,
      });

      await CVStructuredData.create({
        cv_id: cvRecord.cv_id,
        data_json: structuredData,
      });

      await CVFeaturesAnalytics.create({
        cv_id: cvRecord.cv_id,
        ats_score,
        total_years_experience: features.total_years_experience || 0,
        key_skills: features.key_skills || [],
        achievement_count: features.achievement_count || 0,
        has_contact_info: features.has_contact_info || false,
        has_education: features.has_education || false,
        has_experience: features.has_experience || false,
        is_ats_compliant: ats_score >= 70,
      });

      if (ai_intelligence) {
        await CVAIInsights.create({
          cv_id: cvRecord.cv_id,
          job_id: null,
          ai_intelligence,
          ats_score,
          industry_ranking_score,
          industry_ranking_label,
          cleaned_job_description,
          analysis_method,
        });
      }

      console.log(`[${requestId}] CV Analysis completed and saved for user ${userId}`);

      return successResponse(res, {
        cv_id: cvRecord.cv_id,
        structured_data: structuredData,
        features,
        ai_intelligence,
        competency_matrix,
        cleaned_job_description,
        industry_ranking_score,
        industry_ranking_label,
        ats_score,
        analysis_method,
        processing_time,
        saved_to_db: true,
        requestId,
      }, 'تم تحليل CV بنجاح وحفظه في قاعدة البيانات');
    }

    console.log(`[${requestId}] CV Analysis completed (not saved) for user ${userId}`);
    return successResponse(res, {
      structured_data: structuredData,
      features,
      ai_intelligence,
      cleaned_job_description,
      industry_ranking_score,
      industry_ranking_label,
      ats_score,
      analysis_method,
      processing_time,
      saved_to_db: false,
      requestId,
    }, 'تم تحليل CV بنجاح (لم يتم الحفظ)');
  } catch (error) {
    console.error(`[${requestId}] CV Text Analysis Error:`, error);
    return res.status(500).json({
      message: 'فشل في تحليل CV',
      error: error.message,
      requestId,
    });
  }
};

/**
 * @desc تحليل CV ملف (PDF/DOCX) عبر AI Core
 * @route POST /api/ai/cv/analyze-file
 * @access Private
 */
exports.analyzeCVFile = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Start CV File Analysis`);

  try {
    const userId = req.user.user_id;
    const { useAI = false, saveToDb = true, title } = req.body;
    const cvFile = req.file;

    if (!cvFile) {
      return res.status(400).json({ message: 'ملف CV مطلوب', requestId });
    }

    const analysisResult = await aiService.analyzeCVFile(userId, cvFile, useAI);

    if (analysisResult?.success === false || analysisResult?.analysis_method === 'error') {
      return res.status(502).json({
        message: 'فشل تحليل CV (ملف) في خدمة الذكاء الاصطناعي',
        error:
          analysisResult?.error_message ||
          analysisResult?.error ||
          'AI Core analysis failed',
        ai_service_response: analysisResult,
        requestId,
      });
    }

    const structuredData = analysisResult.structured_data || analysisResult.structuredData || {};
    const features = analysisResult.features || {};
    const ats_score = analysisResult.ats_score ?? analysisResult.score ?? 0;
    const analysis_method = analysisResult.analysis_method || analysisResult.analysisMethod || 'ai_core';
    const processing_time = analysisResult.processing_time || analysisResult.processingTime || null;
    const rawAIIntelligence = analysisResult.ai_intelligence || analysisResult.ai_insights || null;
    const competency_matrix = analysisResult.competency_matrix || null;
    const ai_intelligence = rawAIIntelligence
      ? {
          ...rawAIIntelligence,
          ...(competency_matrix ? { competency_matrix } : {}),
        }
      : competency_matrix
        ? { competency_matrix }
        : null;
    const cleaned_job_description = analysisResult.cleaned_job_description || null;
    const industry_ranking_score = analysisResult.industry_ranking_score ?? null;
    const industry_ranking_label = analysisResult.industry_ranking_label ?? null;

    if (saveToDb) {
      const cvRecord = await CV.create({
        user_id: userId,
        title:
          title ||
          `AI Analyzed CV (File) - ${new Date().toISOString().slice(0, 10)}`,
        file_type: cvFile.mimetype,
        file_url: cvFile.path,
      });

      await CVStructuredData.create({
        cv_id: cvRecord.cv_id,
        data_json: structuredData,
      });

      await CVFeaturesAnalytics.create({
        cv_id: cvRecord.cv_id,
        ats_score,
        total_years_experience: features.total_years_experience || 0,
        key_skills: features.key_skills || [],
        achievement_count: features.achievement_count || 0,
        has_contact_info: features.has_contact_info || false,
        has_education: features.has_education || false,
        has_experience: features.has_experience || false,
        is_ats_compliant: ats_score >= 70,
      });

      if (ai_intelligence) {
        await CVAIInsights.create({
          cv_id: cvRecord.cv_id,
          job_id: null,
          ai_intelligence,
          ats_score,
          industry_ranking_score,
          industry_ranking_label,
          cleaned_job_description,
          analysis_method,
        });
      }

      console.log(`[${requestId}] CV File Analysis completed and saved for user ${userId}`);
      return successResponse(
        res,
        {
          cv_id: cvRecord.cv_id,
          structured_data: structuredData,
          features,
          ats_score,
          ai_intelligence,
          competency_matrix,
          cleaned_job_description,
          industry_ranking_score,
          industry_ranking_label,
          analysis_method,
          processing_time,
          saved_to_db: true,
          requestId,
        },
        'تم تحليل CV (ملف) بنجاح وحفظه في قاعدة البيانات'
      );
    }

    console.log(`[${requestId}] CV File Analysis completed (not saved) for user ${userId}`);
    return successResponse(
      res,
      {
        structured_data: structuredData,
        features,
        ats_score,
        ai_intelligence,
        competency_matrix,
        cleaned_job_description,
        industry_ranking_score,
        industry_ranking_label,
        analysis_method,
        processing_time,
        saved_to_db: false,
        requestId,
      },
      'تم تحليل CV (ملف) بنجاح (لم يتم الحفظ)'
    );
  } catch (error) {
    console.error(`[${requestId}] CV File Analysis Error:`, error);
    return res.status(500).json({
      message: 'فشل في تحليل CV (ملف)',
      error: error.message,
      requestId,
    });
  }
};

/**
 * @desc بدء محادثة chatbot
 * @route POST /api/ai/chatbot/start
 * @access Private
 */
exports.startChatbotSession = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Start Chatbot Session`);
  try {
    const { language = 'english', initialData = {}, output_language, job_posting_id, job_description } = req.body;
    const userId = req.user.user_id;

    let jobPosting = null;
    if (job_posting_id) {
      jobPosting = await JobPosting.findByPk(job_posting_id, {
        attributes: ["job_id", "title", "description", "requirements", "location"],
      });
    }

    const result = await aiService.startChatbotSession(userId, language, initialData, {
      output_language,
      job_description,
      job_posting: jobPosting ? jobPosting.toJSON() : null,
    });

    console.log(`[${requestId}] Chatbot Session started for user ${userId}`);
    return successResponse(res, { ...result, requestId }, 'تم بدء محادثة chatbot بنجاح');
  } catch (error) {
    console.error(`[${requestId}] Chatbot Start Error:`, error);
    return res.status(500).json({
      message: 'فشل في بدء محادثة chatbot',
      error: error.message,
      requestId,
    });
  }
};

/**
 * @desc إرسال رسالة chatbot
 * @route POST /api/ai/chatbot/chat
 * @access Private
 */
exports.sendChatbotMessage = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Send Chatbot Message`);
  try {
    const { sessionId, session_id, message, job_posting_id, job_description } = req.body;
    const resolvedSessionId = sessionId || session_id;

    if (!resolvedSessionId || !message) {
      return res.status(400).json({
        message: 'معرف الجلسة والرسالة مطلوبان',
        requestId,
      });
    }

    let jobPosting = null;
    if (job_posting_id) {
      jobPosting = await JobPosting.findByPk(job_posting_id, {
        attributes: ["job_id", "title", "description", "requirements", "location"],
      });
    }

    const result = await aiService.sendChatbotMessage(resolvedSessionId, message, {
      job_description,
      job_posting: jobPosting ? jobPosting.toJSON() : null,
    });

    console.log(`[${requestId}] Message sent in session ${resolvedSessionId}`);
    return successResponse(res, { ...result, requestId }, 'تم إرسال الرسالة بنجاح');
  } catch (error) {
    console.error(`[${requestId}] Chatbot Message Error:`, error);

    if (typeof error?.message === 'string' && error.message.includes('Session not found')) {
      return res.status(404).json({
        message: 'انتهت صلاحية جلسة المحادثة، ابدأ جلسة جديدة',
        error: error.message,
        requestId,
      });
    }

    return res.status(500).json({
      message: 'فشل في إرسال الرسالة',
      error: error.message,
      requestId,
    });
  }
};

/**
 * @desc Get chatbot session details
 * @route GET /api/ai/chatbot/session/:sessionId
 * @access Private
 */
exports.getChatbotSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await aiService.getChatbotSession(sessionId);
    return successResponse(res, result, "Chatbot session retrieved");
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get chatbot session",
      error: error.message,
    });
  }
};

/**
 * @desc Analyze an existing uploaded CV by id (PDF/DOCX) via AI Core
 * @route POST /api/ai/cv/analyze/:cvId
 * @access Private
 */
exports.analyzeExistingCV = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Start Existing CV Analysis`);

  try {
    const userId = req.user.user_id;
    const cvId = parseInt(req.params.cvId, 10);
    const { useAI = true } = req.body || {};

    if (!Number.isFinite(cvId) || cvId <= 0) {
      return res.status(400).json({ message: "Invalid CV ID", requestId });
    }

    const cvRecord = await CV.findOne({ where: { cv_id: cvId, user_id: userId } });
    if (!cvRecord) {
      return res.status(404).json({ message: "CV not found or access denied", requestId });
    }

    if (!cvRecord.file_url) {
      return res.status(400).json({ message: "CV file is missing", requestId });
    }

    const rawPath = String(cvRecord.file_url);
    const backendRoot = path.join(__dirname, "..", "..");
    const normalized = rawPath.replace(/^\/+/, "");
    const filePath = path.isAbsolute(rawPath) ? rawPath : path.join(backendRoot, normalized);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "CV file not found on server", requestId });
    }

    const fileObj = {
      path: filePath,
      originalname: cvRecord.title || `cv_${cvId}`,
      mimetype: cvRecord.file_type || "application/pdf",
    };

    const analysisResult = await aiService.analyzeCVFile(userId, fileObj, useAI);

    if (analysisResult?.success === false || analysisResult?.analysis_method === "error") {
      return res.status(502).json({
        message: "CV analysis failed in AI service",
        error:
          analysisResult?.error_message ||
          analysisResult?.error ||
          "AI Core analysis failed",
        ai_service_response: analysisResult,
        requestId,
      });
    }

    const structuredData = analysisResult.structured_data || analysisResult.structuredData || {};
    const features = analysisResult.features || {};
    const ats_score = analysisResult.ats_score ?? analysisResult.score ?? 0;
    const analysis_method = analysisResult.analysis_method || analysisResult.analysisMethod || "ai_core";
    const processing_time = analysisResult.processing_time || analysisResult.processingTime || null;
    const rawAIIntelligence = analysisResult.ai_intelligence || analysisResult.ai_insights || null;
    const competency_matrix = analysisResult.competency_matrix || null;
    const ai_intelligence = rawAIIntelligence
      ? {
          ...rawAIIntelligence,
          ...(competency_matrix ? { competency_matrix } : {}),
        }
      : competency_matrix
        ? { competency_matrix }
        : null;
    const cleaned_job_description = analysisResult.cleaned_job_description || null;
    const industry_ranking_score = analysisResult.industry_ranking_score ?? null;
    const industry_ranking_label = analysisResult.industry_ranking_label ?? null;

    const structuredRecord = await CVStructuredData.findOne({ where: { cv_id: cvId } });
    if (structuredRecord) {
      await structuredRecord.update({ data_json: structuredData });
    } else {
      await CVStructuredData.create({ cv_id: cvId, data_json: structuredData });
    }

    const featuresRecord = await CVFeaturesAnalytics.findOne({ where: { cv_id: cvId } });
    const featuresPayload = {
      cv_id: cvId,
      ats_score,
      total_years_experience: features.total_years_experience || 0,
      key_skills: features.key_skills || [],
      achievement_count: features.achievement_count || 0,
      has_contact_info: features.has_contact_info || false,
      has_education: features.has_education || false,
      has_experience: features.has_experience || false,
      is_ats_compliant: ats_score >= 70,
    };
    if (featuresRecord) {
      await featuresRecord.update(featuresPayload);
    } else {
      await CVFeaturesAnalytics.create(featuresPayload);
    }

    let aiInsights = null;
    if (ai_intelligence) {
      const insightRecord = await CVAIInsights.findOne({
        where: { cv_id: cvId, job_id: null },
        order: [["insight_id", "DESC"]],
      });
      const insightPayload = {
        cv_id: cvId,
        job_id: null,
        ai_intelligence,
        ats_score,
        industry_ranking_score,
        industry_ranking_label,
        cleaned_job_description,
        analysis_method,
      };
      if (insightRecord) {
        await insightRecord.update(insightPayload);
        aiInsights = insightRecord.toJSON ? insightRecord.toJSON() : insightRecord;
      } else {
        const created = await CVAIInsights.create(insightPayload);
        aiInsights = created.toJSON ? created.toJSON() : created;
      }
    }

    console.log(`[${requestId}] Existing CV analysis completed for user ${userId}`);
    return successResponse(res, {
      cv_id: cvRecord.cv_id,
      title: cvRecord.title,
      created_at: cvRecord.created_at,
      structured_data: structuredData,
      features_analytics: featuresPayload,
      ai_insights: aiInsights,
      partial: false,
      warnings: [],
      requestId,
      analysis_method,
      processing_time,
    }, "CV analysis generated successfully");
  } catch (error) {
    console.error(`[${requestId}] Existing CV Analysis Error:`, error);
    return res.status(500).json({
      message: "Failed to analyze existing CV",
      error: error.message,
      requestId,
    });
  }
};

/**
 * @desc List chatbot sessions for current user
 * @route GET /api/ai/chatbot/sessions
 * @access Private
 */
exports.listChatbotSessions = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await aiService.listChatbotSessions(String(userId));
    return successResponse(res, result, "Chatbot sessions fetched");
  } catch (error) {
    return res.status(500).json({
      message: "Failed to list chatbot sessions",
      error: error.message,
    });
  }
};

/**
 * @desc Update chatbot session metadata (e.g., title)
 * @route PATCH /api/ai/chatbot/session/:sessionId
 * @access Private
 */
exports.updateChatbotSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body || {};
    const userId = req.user.user_id;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const result = await aiService.updateChatbotSession(sessionId, userId, { title });
    return successResponse(res, result, "Chatbot session updated");
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update chatbot session",
      error: error.message,
    });
  }
};

/**
 * @desc Delete chatbot session
 * @route DELETE /api/ai/chatbot/session/:sessionId
 * @access Private
 */
exports.deleteChatbotSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.user_id;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const result = await aiService.deleteChatbotSession(sessionId, userId);
    return successResponse(res, result, "Chatbot session deleted");
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete chatbot session",
      error: error.message,
    });
  }
};

/**
 * @desc Get chatbot insights (score + summary)
 * @route GET /api/ai/chatbot/insights/:sessionId
 * @access Private
 */
exports.getChatbotInsights = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.user_id;
    const result = await aiService.getChatbotInsights(sessionId, userId);
    return successResponse(res, result, "Chatbot insights fetched");
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get chatbot insights",
      error: error.message,
    });
  }
};

/**
 * @desc Export chatbot CV document
 * @route POST /api/ai/chatbot/export
 * @access Private
 */
exports.exportChatbotDocument = async (req, res) => {
  try {
    const { session_id, sessionId, format = "pdf", language } = req.body;
    const resolvedSessionId = sessionId || session_id;

    if (!resolvedSessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const response = await aiService.exportChatbotDocument(resolvedSessionId, format, language);
    const contentType = response.headers["content-type"] || "application/octet-stream";
    const contentDisposition = response.headers["content-disposition"];

    if (contentDisposition) {
      res.setHeader("Content-Disposition", contentDisposition);
    }
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(response.data);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to export CV document",
      error: error.message,
    });
  }
};

/**
 * @desc Preview chatbot CV document (HTML)
 * @route GET /api/ai/chatbot/preview/:sessionId
 * @access Private
 */
exports.previewChatbotDocument = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { language } = req.query;
    const response = await aiService.previewChatbotDocument(sessionId, language);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(response.data);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to preview CV document",
      error: error.message,
    });
  }
};

/**
 * @desc فحص صحة اتصال AI service
 * @route GET /api/ai/health
 * @access Public
 */
exports.aiHealthCheck = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] AI Health Check`);
  try {
    const aiHealth = await aiService.healthCheck();

    return successResponse(res, {
      node_backend: 'healthy',
      ai_service: aiHealth,
      ai_service_url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
      requestId,
    }, 'كل الخدمات تعمل بشكل صحيح');
  } catch (error) {
    console.error(`[${requestId}] AI Health Check Error:`, error);
    return res.status(503).json({
      message: 'AI Service غير متوفر',
      node_backend: 'healthy',
      ai_service: 'unavailable',
      error: error.message,
      requestId,
    });
  }
};

/**
 * @desc Debug AI auth config (safe; no secrets) + probe AI Core connection
 * @route GET /api/ai/debug/auth
 * @access Private
 */
exports.debugAuth = async (req, res) => {
  const requestId = uuidv4();
  const authMode = (process.env.AI_CORE_AUTH_MODE || 'apikey').toLowerCase();

  const configSnapshot = {
    ai_service_url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    ai_core_auth_mode: authMode,
    ai_core_jwt_secret_present: !!process.env.AI_CORE_JWT_SECRET,
    ai_core_api_key_present: !!process.env.AI_CORE_API_KEY,
    ai_core_jwt_issuer: process.env.AI_CORE_JWT_ISSUER || 'jobgate-backend',
    ai_core_jwt_audience: process.env.AI_CORE_JWT_AUDIENCE || 'jobgate-ai-core',
    requestId,
  };

  try {
    const aiHealth = await aiService.healthCheck();
    return res.status(200).json({
      success: true,
      message: 'AI auth debug (probe ok)',
      config: configSnapshot,
      ai_core_probe: {
        ok: true,
        status: 200,
        data: aiHealth,
      },
    });
  } catch (error) {
    const msg = error?.message || 'Unknown error';
    const statusMatch = msg.match(/status=(\d+)/i);
    const upstreamStatus = statusMatch ? parseInt(statusMatch[1], 10) : null;

    return res.status(200).json({
      success: true,
      message: 'AI auth debug (probe failed)',
      config: configSnapshot,
      ai_core_probe: {
        ok: false,
        status: upstreamStatus,
        error: msg,
      },
    });
  }
};

/**
 * @desc الحصول على تحليل CV من قاعدة البيانات
 * @route GET /api/ai/cv/analysis/:cvId
 * @access Private
 */
exports.getCVAnalysis = async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Get CV Analysis`);
  try {
    const cvId = parseInt(req.params.cvId, 10);
    const userId = req.user.user_id;

    if (!Number.isFinite(cvId) || cvId <= 0) {
      return res.status(400).json({
        message: "Invalid CV ID",
        requestId,
      });
    }

    const cvRecord = await CV.findOne({ where: { cv_id: cvId, user_id: userId } });

    if (!cvRecord) {
      return res.status(404).json({
        message: "CV not found or access denied",
        requestId,
      });
    }

    let structuredData = {};
    let featuresAnalytics = {};
    let aiInsights = null;
    let partial = false;
    const warnings = [];

    try {
      const structured = await CVStructuredData.findOne({ where: { cv_id: cvId } });
      structuredData = structured?.data_json || {};
    } catch (innerError) {
      partial = true;
      warnings.push("structured_data_unavailable");
      console.warn(
        `[${requestId}] structured_data fetch failed for cv_id=${cvId}:`,
        innerError.message
      );
    }

    try {
      const analytics = await CVFeaturesAnalytics.findOne({ where: { cv_id: cvId } });
      featuresAnalytics = analytics ? analytics.toJSON() : {};
    } catch (innerError) {
      partial = true;
      warnings.push("features_analytics_unavailable");
      console.warn(
        `[${requestId}] features_analytics fetch failed for cv_id=${cvId}:`,
        innerError.message
      );
    }

    try {
      const insight = await CVAIInsights.findOne({
        where: { cv_id: cvId, job_id: null },
        order: [["insight_id", "DESC"]],
      });
      aiInsights = insight ? insight.toJSON() : null;
    } catch (innerError) {
      partial = true;
      warnings.push("ai_insights_unavailable");
      console.warn(
        `[${requestId}] ai_insights fetch failed for cv_id=${cvId}:`,
        innerError.message
      );
    }

    const result = {
      cv_id: cvRecord.cv_id,
      title: cvRecord.title,
      created_at: cvRecord.created_at,
      structured_data: structuredData,
      features_analytics: featuresAnalytics,
      ai_insights: aiInsights,
      partial,
      warnings,
      requestId,
    };

    console.log(`[${requestId}] CV Analysis fetched for user ${userId}`);
    return successResponse(
      res,
      result,
      partial ? "CV analysis loaded partially" : "CV analysis loaded successfully"
    );
  } catch (error) {
    console.error(`[${requestId}] Get CV Analysis Error:`, error);
    return res.status(500).json({
      message: "Failed to fetch CV analysis",
      error: error.message,
      requestId,
    });
  }
};
exports.generateCVMatchPitch = async (req, res) => {
  const requestId = uuidv4();
  try {
    const userId = req.user.user_id;
    const { cv_id, job_id, language = "en" } = req.body || {};

    if (!cv_id || !job_id) {
      return res.status(400).json({
        message: "cv_id and job_id are required",
        requestId,
      });
    }

    const cvRecord = await CV.findOne({
      where: { cv_id, user_id: userId },
      include: [{ model: CVStructuredData }],
    });

    if (!cvRecord) {
      return res.status(404).json({
        message: "CV not found or access denied",
        requestId,
      });
    }

    const job = await JobPosting.findByPk(job_id, {
      attributes: ["job_id", "title", "description", "requirements"],
    });

    if (!job) {
      return res.status(404).json({
        message: "Job posting not found",
        requestId,
      });
    }

    const jobDescription = [job.title, job.description, job.requirements]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    let cvText = "";
    if (cvRecord.file_url) {
      try {
        const rawPath = String(cvRecord.file_url);
        const backendRoot = path.join(__dirname, "..", "..");
        const normalized = rawPath.replace(/^\/+/, "");
        const filePath = path.isAbsolute(rawPath)
          ? rawPath
          : path.join(backendRoot, normalized);
        cvText = await extractTextFromFile(filePath);
      } catch (fileError) {
        console.warn("Could not extract CV text from file, using structured data fallback.");
      }
    }

    if (!cvText || cvText.trim().length < 20) {
      const structured = cvRecord.CV_Structured_Data?.data_json || {};
      cvText = JSON.stringify(structured);
    }

    const pitchResponse = await aiService.generateMatchPitch(cvText, jobDescription, language);
    const pitch = pitchResponse?.pitch || "";

    const existing = await CVAIInsights.findOne({
      where: { cv_id, job_id },
    });

    if (existing) {
      const aiIntel = {
        ...(existing.ai_intelligence || {}),
        smart_match_pitch: pitch,
      };
      await existing.update({
        ai_intelligence: aiIntel,
      });
    } else {
      await CVAIInsights.create({
        cv_id,
        job_id,
        ai_intelligence: {
          smart_match_pitch: pitch,
        },
        cleaned_job_description: pitchResponse?.cleaned_job_description || null,
        analysis_method: "smart_match_pitch",
      });
    }

    return successResponse(
      res,
      {
        cv_id,
        job_id,
        pitch,
        language,
        required_skills: pitchResponse?.required_skills || [],
        requestId,
      },
      "Smart match pitch generated successfully."
    );
  } catch (error) {
    console.error(`[${requestId}] Smart match pitch generation error:`, error);
    return res.status(500).json({
      message: "Failed to generate smart match pitch",
      error: error.message,
      requestId,
    });
  }
};
