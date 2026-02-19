// file: src/routes/ai.routes.js
const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { verifyToken } = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");
const { uploadCV } = require("../middleware/upload.middleware");

// ============================================
//          AI APIs
// ============================================

// ØªØ­Ù„ÙŠÙ„ CV Ù†ØµÙŠ
router.post("/cv/analyze-text", 
  verifyToken, 
  aiController.analyzeCVText
);

// ØªØ­Ù„ÙŠÙ„ CV Ù…Ù„Ù (Multipart) Ø¹Ø¨Ø± Ø§Ù„Ù€ Backend Ø«Ù… AI Core
router.post(
  "/cv/analyze-file",
  verifyToken,
  uploadCV,
  aiController.analyzeCVFile
);

// Analyze existing uploaded CV by id
router.post("/cv/analyze/:cvId",
  verifyToken,
  aiController.analyzeExistingCV
);

// Ø¨Ø¯Ø¡ Ù…Ø­Ø§Ø¯Ø«Ø© chatbot
router.post("/chatbot/start", 
  verifyToken, 
  aiController.startChatbotSession
);

// Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© chatbot
router.post("/chatbot/chat", 
  verifyToken, 
  aiController.sendChatbotMessage
);

// Get chatbot session
router.get("/chatbot/session/:sessionId",
  verifyToken,
  aiController.getChatbotSession
);

// Update chatbot session (title, metadata)
router.patch("/chatbot/session/:sessionId",
  verifyToken,
  aiController.updateChatbotSession
);

// Delete chatbot session
router.delete("/chatbot/session/:sessionId",
  verifyToken,
  aiController.deleteChatbotSession
);

// List chatbot sessions
router.get("/chatbot/sessions",
  verifyToken,
  aiController.listChatbotSessions
);

// Export chatbot CV document
router.post("/chatbot/export",
  verifyToken,
  aiController.exportChatbotDocument
);

// Preview chatbot CV (HTML)
router.get("/chatbot/preview/:sessionId",
  verifyToken,
  aiController.previewChatbotDocument
);

// Chatbot insights (score + summary)
router.get("/chatbot/insights/:sessionId",
  verifyToken,
  aiController.getChatbotInsights
);

// Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ ØªØ­Ù„ÙŠÙ„ CV Ù…Ø­ÙÙˆØ¸
router.get("/cv/analysis/:cvId", 
  verifyToken, 
  aiController.getCVAnalysis
);
// Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø³Ø¬Ù„ ØªØ­Ù„ÙŠÙ„ات CV
router.get(
  "/cv/analysis/:cvId/history",
  verifyToken,
  aiController.getCVAnalysisHistory
);

router.post(
  "/cv/generate-pitch",
  verifyToken,
  aiController.generateCVMatchPitch
);

// ÙØ­Øµ ØµØ­Ø© AI service
router.get("/health", 
  aiController.aiHealthCheck
);

// Debug auth configuration + probe (safe)
router.get(
  "/debug/auth",
  verifyToken,
  aiController.debugAuth
);

// ============================================
//       APIs Ù„Ø§Ø®ØªØ¨Ø§Ø± AI Service
// ============================================

/**
 * @desc Ø§Ø®ØªØ¨Ø§Ø± Ø§ØªØµØ§Ù„ Ù…Ø¹ AI service (Ù„Ù„ØªØ·ÙˆÙŠØ±)
 * @route POST /api/ai/test-connection
 * @access Private (Admin ÙÙ‚Ø·)
 */
router.post("/test-connection",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const aiService = require("../services/aiService");
      
      // Ø§Ø®ØªØ¨Ø§Ø± Ø¨Ø³ÙŠØ· Ù„Ù„Ù†Øµ
      const testText = `John Doe
Email: john@example.com
Phone: +1-555-123-4567

Experience:
- Software Developer at TechCorp (2020-2024)
- Built REST APIs with Node.js

Skills: JavaScript, Node.js, React
Education: BS Computer Science, University (2016-2020)`;

      const result = await aiService.analyzeCVText('test_user', testText, false);
      
      return res.status(200).json({
        success: true,
        message: "AI Service connection successful",
        test_result: {
          status: result.success || true,
          ats_score: result.ats_score || result.score,
          has_skills: result.features?.key_skills?.length > 0 || false
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "AI Service connection failed",
        error: error.message
      });
    }
  }
);

/**
 * @desc Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ ØªØ­Ù„ÙŠÙ„ Ø¬Ù…ÙŠØ¹ CVs Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…
 * @route GET /api/ai/user/cvs
 * @access Private
 */
router.get("/user/cvs", 
  verifyToken, // ØªÙ… Ø§Ù„ØªØµØ­ÙŠØ­ Ù‡Ù†Ø§
  async (req, res) => {
    try {
      const { CV, CVStructuredData, CVFeaturesAnalytics } = require("../models");
      const userId = req.user.user_id;

      const cvs = await CV.findAll({
        where: { user_id: userId },
        include: [
          { 
            model: CVStructuredData,
            attributes: ['cv_struct_id', 'data_json', 'created_at']
          },
          { 
            model: CVFeaturesAnalytics,
            attributes: ['ats_score', 'total_years_experience', 'key_skills', 'is_ats_compliant']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const formattedCVs = cvs.map(cv => ({
        cv_id: cv.cv_id,
        title: cv.title,
        file_type: cv.file_type,
        created_at: cv.created_at,
        last_updated_at: cv.last_updated_at,
        has_structured_data: !!cv.CV_Structured_Data,
        has_analytics: !!cv.CV_Features_Analytics,
        ats_score: cv.CV_Features_Analytics?.ats_score || 0,
        is_ats_compliant: cv.CV_Features_Analytics?.is_ats_compliant || false,
        key_skills_count: cv.CV_Features_Analytics?.key_skills?.length || 0
      }));

      return res.status(200).json({
        success: true,
        message: "ØªÙ… Ø¬Ù„Ø¨ CVs Ø¨Ù†Ø¬Ø§Ø­",
        count: formattedCVs.length,
        cvs: formattedCVs
      });
    } catch (error) {
      console.error('Get User CVs Error:', error);
      return res.status(500).json({
        success: false,
        message: "ÙØ´Ù„ ÙÙŠ Ø¬Ù„Ø¨ CVs",
        error: error.message
      });
    }
  }
);

module.exports = router;


