const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");
const fs = require("fs");
const jwt = require("jsonwebtoken");

// Helper: sleep between retries
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AIService {
  constructor() {
    this.aiBaseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    this.apiKey = process.env.AI_CORE_API_KEY || "";
    this.jwtSecret = process.env.AI_CORE_JWT_SECRET || "";
    this.authMode = (process.env.AI_CORE_AUTH_MODE || "apikey").toLowerCase();
    this.jwtIssuer = process.env.AI_CORE_JWT_ISSUER || "jobgate-backend";
    this.jwtAudience = process.env.AI_CORE_JWT_AUDIENCE || "jobgate-ai-core";
    this.jwtTtlSeconds =
      parseInt(process.env.AI_CORE_JWT_TTL_SECONDS, 10) || 60;
    this.maxRetries = parseInt(process.env.AI_SERVICE_MAX_RETRIES, 10) || 2;
    this.retryDelayMs = parseInt(process.env.AI_SERVICE_RETRY_DELAY_MS, 10) || 500;

    if (!this.apiKey) {
      console.warn(
        "⚠️  AI_CORE_API_KEY is not set. AI Core requests are NOT secured!"
      );
    }
    if ((this.authMode === "jwt" || this.authMode === "both") && !this.jwtSecret) {
      console.warn(
        "⚠️  AI_CORE_JWT_SECRET is not set while AI_CORE_AUTH_MODE requires JWT. AI Core requests may fail."
      );
    }

    const initialHeaders = {
      "Content-Type": "application/json",
      ...this._buildAuthHeaders(),
    };
    this.aiClient = axios.create({
      baseURL: this.aiBaseUrl,
      timeout: parseInt(process.env.AI_SERVICE_TIMEOUT, 10) || 30000,
      headers: initialHeaders,
    });

    this.aiClient.interceptors.request.use((config) => {
      config.headers["X-Request-Id"] = uuidv4();
      const authHeaders = this._buildAuthHeaders();
      config.headers = {
        ...(config.headers || {}),
        ...authHeaders,
      };
      return config;
    });
  }

  _buildAuthHeaders() {
    const headers = {};

    if (this.authMode === "jwt" || this.authMode === "both") {
      if (this.jwtSecret) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const token = jwt.sign(
          {
            iss: this.jwtIssuer,
            aud: this.jwtAudience,
            iat: nowSeconds,
            exp: nowSeconds + this.jwtTtlSeconds,
            scope: "ai_core",
          },
          this.jwtSecret,
          { algorithm: "HS256" }
        );
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    if (this.authMode === "apikey" || this.authMode === "both") {
      headers["X-API-Key"] = this.apiKey;
    }

    return headers;
  }

  // Public Methods
  async analyzeCVText(userId, cvText, useAI = false, options = {}) {
    const normalizedUserId = userId != null ? String(userId) : "";
    return this._requestWithRetry("/cv/analyze-text", {
      user_id: normalizedUserId,
      cv_text: cvText,
      use_ai: useAI,
      job_description: options.job_description,
    }, "CV Analysis");
  }

  async analyzeCVFile(userId, cvFile, useAI = false, options = {}) {
    const normalizedUserId = userId != null ? String(userId) : "";
    return this._requestFileWithRetry("/cv/analyze", {
      user_id: normalizedUserId,
      use_ai: useAI,
      job_description: options.job_description,
    }, cvFile, "CV File Analysis");
  }

  async generateMatchPitch(cvText, jobDescription, language = "en") {
    return this._requestWithRetry(
      "/cv/generate-pitch",
      {
        cv_text: cvText,
        job_description: jobDescription,
        language,
      },
      "Smart Match Pitch"
    );
  }

  async startChatbotSession(userId, language = "english", initialData = {}, options = {}) {
    const normalizedUserId = userId != null ? String(userId) : "";
    return this._requestWithRetry("/chatbot/start", {
      user_id: normalizedUserId,
      language,
      initial_data: initialData,
      output_language: options.output_language,
      job_description: options.job_description,
      job_posting: options.job_posting,
    }, "Chatbot Start");
  }

  async sendChatbotMessage(sessionId, message, options = {}) {
    return this._requestWithRetry("/chatbot/chat", {
      session_id: sessionId,
      message,
      job_description: options.job_description,
      job_posting: options.job_posting,
    }, "Chatbot Message");
  }

  async getChatbotSession(sessionId) {
    return this._requestWithRetry(`/chatbot/session/${sessionId}`, null, "Chatbot Session", "get");
  }

  async listChatbotSessions(userId) {
    return this._requestWithRetry(`/chatbot/sessions?user_id=${encodeURIComponent(userId)}`, null, "Chatbot Sessions", "get");
  }

  async updateChatbotSession(sessionId, userId, updates = {}) {
    return this._requestWithRetry(`/chatbot/session/${encodeURIComponent(sessionId)}`, {
      user_id: String(userId),
      ...updates,
    }, "Chatbot Session Update", "patch");
  }

  async deleteChatbotSession(sessionId, userId) {
    const url = `/chatbot/session/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(String(userId))}`;
    return this._requestWithRetry(url, null, "Chatbot Session Delete", "delete");
  }

  async getChatbotInsights(sessionId, userId) {
    const url = `/chatbot/insights/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(String(userId))}`;
    return this._requestWithRetry(url, null, "Chatbot Insights", "get");
  }

  async exportChatbotDocument(sessionId, format = "pdf", language = undefined) {
    const payload = {
      session_id: sessionId,
      format,
      language,
    };

    const response = await this.aiClient.post("/chatbot/export", payload, {
      responseType: "arraybuffer",
      headers: {
        "Content-Type": "application/json",
        ...this._buildAuthHeaders(),
      },
    });

    return {
      data: response.data,
      headers: response.headers,
      status: response.status,
    };
  }

  async previewChatbotDocument(sessionId, language = undefined) {
    const params = new URLSearchParams();
    if (language) {
      params.set("language", language);
    }
    const url = params.toString()
      ? `/chatbot/preview/${encodeURIComponent(sessionId)}?${params.toString()}`
      : `/chatbot/preview/${encodeURIComponent(sessionId)}`;

    const response = await this.aiClient.get(url, {
      responseType: "text",
      headers: {
        ...this._buildAuthHeaders(),
      },
    });

    return {
      data: response.data,
      headers: response.headers,
      status: response.status,
    };
  }

  async healthCheck() {
    return this._requestWithRetry("/health", null, "Health Check", "get");
  }

  // Private Methods
  async _requestWithRetry(endpoint, payload = {}, context = "", method = "post") {
    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      try {
        const verb = method.toLowerCase();
        let response;
        if (verb === "get") {
          response = await this.aiClient.get(endpoint);
        } else if (verb === "patch") {
          response = await this.aiClient.patch(endpoint, payload);
        } else if (verb === "delete") {
          response = await this.aiClient.delete(endpoint, { data: payload || {} });
        } else {
          response = await this.aiClient.post(endpoint, payload);
        }

        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;

        if (!status || (status >= 500 && status < 600)) {
          attempt++;
          if (attempt <= this.maxRetries) {
            console.warn(
              `⚠️ ${context} failed (attempt ${attempt}). Retrying in ${this.retryDelayMs}ms...`
            );
            await sleep(this.retryDelayMs);
            continue;
          }
        }
        break;
      }
    }

    this._handleError(context, lastError);
  }

  async _requestFileWithRetry(endpoint, query = {}, file, context = "") {
    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      try {
        const form = new FormData();
        form.append("file", fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        Object.entries(query || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== "use_ai") {
            form.append(key, String(value));
          }
        });

        const response = await this.aiClient.post(endpoint, form, {
          params: { user_id: query.user_id, use_ai: query.use_ai },
          headers: {
            ...form.getHeaders(),
            ...this._buildAuthHeaders(),
          },
        });

        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;

        if (!status || (status >= 500 && status < 600)) {
          attempt++;
          if (attempt <= this.maxRetries) {
            console.warn(
              `⚠️ ${context} failed (attempt ${attempt}). Retrying in ${this.retryDelayMs}ms...`
            );
            await sleep(this.retryDelayMs);
            continue;
          }
        }

        break;
      }
    }

    this._handleError(context, lastError);
  }

  _handleError(context, error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const message =
      (responseData && (responseData.detail || responseData.message)) ||
      error.message ||
      'Unknown error';

    let extra = '';
    try {
      if (responseData != null) {
        extra = ` | upstream_body=${JSON.stringify(responseData)}`;
      }
    } catch (_) {
      extra = ' | upstream_body=<unserializable>';
    }

    console.error(`❌ AI Service Error [${context}]`, {
      status,
      message,
      responseData,
    });

    throw new Error(
      `AI Service ${context} failed: status=${status ?? 'n/a'} message=${message}${extra}`
    );
  }
}

module.exports = new AIService();
