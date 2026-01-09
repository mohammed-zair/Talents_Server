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
  async analyzeCVText(userId, cvText, useAI = false) {
    const normalizedUserId = userId != null ? String(userId) : "";
    return this._requestWithRetry("/cv/analyze-text", {
      user_id: normalizedUserId,
      cv_text: cvText,
      use_ai: useAI,
    }, "CV Analysis");
  }

  async analyzeCVFile(userId, cvFile, useAI = false) {
    const normalizedUserId = userId != null ? String(userId) : "";
    return this._requestFileWithRetry("/cv/analyze", {
      user_id: normalizedUserId,
      use_ai: useAI,
    }, cvFile, "CV File Analysis");
  }

  async startChatbotSession(userId, language = "english", initialData = {}) {
    const normalizedUserId = userId != null ? String(userId) : "";
    return this._requestWithRetry("/chatbot/start", {
      user_id: normalizedUserId,
      language,
      initial_data: initialData,
    }, "Chatbot Start");
  }

  async sendChatbotMessage(sessionId, message) {
    return this._requestWithRetry("/chatbot/chat", {
      session_id: sessionId,
      message,
    }, "Chatbot Message");
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
        const response =
          method.toLowerCase() === "get"
            ? await this.aiClient.get(endpoint)
            : await this.aiClient.post(endpoint, payload);

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

        const response = await this.aiClient.post(endpoint, form, {
          params: query,
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
