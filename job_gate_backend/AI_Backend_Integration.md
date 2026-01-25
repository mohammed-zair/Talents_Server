# Backend <-> AI Integration

This document explains how the backend connects to AI Core, how it stores AI
results, how it sends requests to AI, and what is currently missing or miswired.

## Components and files
- Backend AI client: `job_gate_backend/src/services/aiService.js`
- Backend AI routes: `job_gate_backend/src/routes/ai.routes.js`
- Backend AI controller: `job_gate_backend/src/controllers/ai.controller.js`
- Storage tables/models:
  - `job_gate_backend/src/models/cv.model.js`
  - `job_gate_backend/src/models/cvStructuredData.model.js`
  - `job_gate_backend/src/models/cvFeaturesAnalytics.model.js`

## How the backend sends to AI
All AI calls are made by `aiService.js` using Axios with retries:
- Base URL: `AI_SERVICE_URL` (default `http://localhost:8000`)
- Auth headers:
  - `X-API-Key` from `AI_CORE_API_KEY` if `AI_CORE_AUTH_MODE=apikey|both`
  - `Authorization: Bearer <jwt>` if `AI_CORE_AUTH_MODE=jwt|both`
- Request id: `X-Request-Id` added per request
- Retries: `AI_SERVICE_MAX_RETRIES` (default 2) with delay

Request mapping (backend -> AI Core):
- Analyze CV text:
  - Backend: `POST /api/ai/cv/analyze-text`
  - AI Core: `POST /cv/analyze-text`
  - Payload: `{ user_id, cv_text, use_ai }`
- Analyze CV file:
  - Backend: `POST /api/ai/cv/analyze-file` (multipart `file`)
  - AI Core: `POST /cv/analyze` (multipart `file`, query `user_id`, `use_ai`)
- Chatbot:
  - Backend: `POST /api/ai/chatbot/start` -> `POST /chatbot/start`
  - Backend: `POST /api/ai/chatbot/chat` -> `POST /chatbot/chat`
- Health:
  - Backend: `GET /api/ai/health` -> `GET /health`

## How the backend stores AI results
When `saveToDb=true` (default in backend):
- The backend writes to its own DB, independent of AI Core storage.
- Tables:
  - `cvs` (CV record with `user_id`, `file_type`, `file_url`, `title`)
  - `cv_structured_data` (JSON `data_json`)
  - `cv_features_analytics` (ATS and features)

Storage mapping (from AI response):
- `structured_data` -> `cv_structured_data.data_json`
- `features` -> mapped into `cv_features_analytics`:
  - `total_years_experience`
  - `key_skills`
  - `achievement_count`
  - `has_contact_info`
  - `has_education`
  - `has_experience`
  - `is_ats_compliant` (computed as `ats_score >= 70`)
- `ats_score` -> `cv_features_analytics.ats_score`

## How the backend exposes stored AI data
Stored data can be retrieved using:
- `GET /api/ai/cv/analysis/:cvId` (returns `structured_data` + `features_analytics`)
- `GET /api/ai/user/cvs` (lists CVs + summary analytics)

## What is not connected or not correctly connected
Missing/unused AI Core endpoints in backend:
- AI Core has `/cv/history/{user_id}`, `/cv/status`, `/cv/features/{cv_id}`
  but no backend routes proxy them.
- AI Core has `/chatbot/session/{session_id}` but backend does not expose it.
- AI Core has `/builder/*` and `/export/health` but backend does not expose them.

Potential misconfigurations:
- Auth mismatch: AI Core validates against `API_KEYS` (AI Core env), while
  backend sends `AI_CORE_API_KEY`. These must match or AI Core will reject.
- JWT auth mismatch: if `AI_CORE_AUTH_MODE=jwt|both` and
  `AI_CORE_JWT_SECRET` is missing in backend, AI calls will fail.

Behavior mismatches:
- AI Core also saves analyses to its own DB asynchronously, but the backend
  never reads from the AI Core DB. This means duplicate storage and the
  AI Core history endpoints are unused.
- For file analysis, `analysis_method` and `processing_time` are returned to
  the client but not stored in the backend DB.
- For text analysis, `analysis_method` and `processing_time` are returned to
  the client but not stored in the backend DB.

## Summary of current flow
1) Frontend -> Backend `/api/ai/*` (user JWT)
2) Backend -> AI Core (service auth header)
3) Backend stores AI results in `cvs`, `cv_structured_data`,
   `cv_features_analytics` (if `saveToDb=true`)
4) Frontend can fetch stored analysis via backend endpoints
