// file: src/controllers/ai.controller.js
const aiService = require('../services/aiService');
const { CV, CVStructuredData, CVFeaturesAnalytics, JobPosting } = require('../models');
const { successResponse } = require('../utils/responseHandler');
const { v4: uuidv4 } = require('uuid');

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

      console.log(`[${requestId}] CV Analysis completed and saved for user ${userId}`);

      return successResponse(res, {
        cv_id: cvRecord.cv_id,
        structured_data: structuredData,
        features,
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

      console.log(`[${requestId}] CV File Analysis completed and saved for user ${userId}`);
      return successResponse(
        res,
        {
          cv_id: cvRecord.cv_id,
          structured_data: structuredData,
          features,
          ats_score,
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
    const { cvId } = req.params;
    const userId = req.user.user_id;

    const cvRecord = await CV.findOne({
      where: { cv_id: cvId, user_id },
      include: [
        { model: CVStructuredData },
        { model: CVFeaturesAnalytics }
      ]
    });

    if (!cvRecord) {
      return res.status(404).json({
        message: 'CV غير موجود أو ليس لديك صلاحية الوصول',
        requestId,
      });
    }

    const result = {
      cv_id: cvRecord.cv_id,
      title: cvRecord.title,
      created_at: cvRecord.created_at,
      structured_data: cvRecord.CV_Structured_Data?.data_json || {},
      features_analytics: cvRecord.CV_Features_Analytics || {},
      requestId,
    };

    console.log(`[${requestId}] CV Analysis fetched for user ${userId}`);
    return successResponse(res, result, 'تم جلب تحليل CV بنجاح');
  } catch (error) {
    console.error(`[${requestId}] Get CV Analysis Error:`, error);
    return res.status(500).json({
      message: 'فشل في جلب تحليل CV',
      error: error.message,
      requestId,
    });
  }
};
