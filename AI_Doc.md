# Job Gate AI Integration (Talents_Server)

This document summarizes the AI Core ("job_gate_ai") endpoints and how the
frontend and backend should integrate with them.

## Services overview
- AI Core: FastAPI service under `job_gate_ai/`
- Backend: Node/Express under `job_gate_backend/`
- Frontend: should call Backend only; Backend proxies to AI Core

## AI Core (job_gate_ai) endpoints
Base URL: `AI_SERVICE_URL` (default `http://localhost:8000`)

Public info:
- `GET /` service info and version
- `GET /health` health status
- `GET /debug/auth` auth mode and JWT config (no secrets)
- `POST /test-cv` basic test endpoint (text -> mock analysis)

CV analysis:
- `POST /cv/analyze`
  - Multipart: `file`
  - Query: `user_id`, `use_ai` (bool)
  - Result: structured data + ATS score + features
- `POST /cv/analyze-text`
  - JSON: `{ user_id, cv_text, use_ai }`
- `GET /cv/history/{user_id}?limit=20`
- `GET /cv/status`
- `GET /cv/features/{cv_id}` (placeholder response)

Chatbot:
- `POST /chatbot/start`
  - JSON: `{ user_id, language, initial_data }`
- `POST /chatbot/chat`
  - JSON: `{ session_id, message }`
- `GET /chatbot/session/{session_id}`

Interactive builder:
- `POST /builder/start`
  - JSON: `{ user_id, language, initial_cv }`
- `POST /builder/chat`
  - JSON: `{ user_id, message }`
- `POST /builder/generate-section`
  - JSON: `{ section, user_inputs }`
- `GET /builder/session/{user_id}`

Export:
- `GET /export/health` (placeholder)

Note: Only the routers included in `job_gate_ai/app/main.py` are active:
`cv_analysis`, `chatbot`, `interactive_builder`, `export`.

## Backend (job_gate_backend) AI routes
Base: `/api/ai`

- `POST /cv/analyze-text` (JWT required)
  - Body: `{ cvText, useAI=false, saveToDb=true }`
  - Proxies to AI Core `/cv/analyze-text`
- `POST /cv/analyze-file` (JWT required, multipart `file`)
  - Body: `{ useAI=false, saveToDb=true, title }`
  - Proxies to AI Core `/cv/analyze`
- `POST /chatbot/start` (JWT required)
  - Body: `{ language="english", initialData={} }`
  - Proxies to AI Core `/chatbot/start`
- `POST /chatbot/chat` (JWT required)
  - Body: `{ sessionId | session_id, message }`
  - Proxies to AI Core `/chatbot/chat`
- `GET /cv/analysis/:cvId` (JWT required)
  - Returns saved analysis from DB
- `GET /user/cvs` (JWT required)
  - Lists saved CVs for the user
- `GET /health` (public)
  - Checks backend + AI Core health
- `GET /debug/auth` (JWT required)
  - Shows auth config snapshot + AI Core probe
- `POST /test-connection` (JWT required)
  - Simple AI Core connectivity test

## Auth between Backend and AI Core
AI Core requires auth on all included routers:
- `AI_CORE_AUTH_MODE=apikey|jwt|both`
- API key: `X-API-Key` must match `API_KEYS` on AI Core
- JWT: `Authorization: Bearer <token>` signed with
  `AI_CORE_JWT_SECRET` and matching issuer/audience

Backend (`job_gate_backend/src/services/aiService.js`) attaches:
- `X-API-Key` from `AI_CORE_API_KEY` when apikey/both
- `Authorization: Bearer <jwt>` when jwt/both

## Integration flow (Frontend -> Backend -> AI Core)
Frontend should only call Backend. Backend handles user auth and AI Core auth.

1) CV Text Analysis
- FE -> `POST /api/ai/cv/analyze-text` (user JWT)
- BE -> AI Core `/cv/analyze-text`
- BE returns normalized `{ structured_data, features, ats_score, cv_id? }`

2) CV File Analysis
- FE -> `POST /api/ai/cv/analyze-file` multipart (user JWT)
- BE -> AI Core `/cv/analyze` with file + `user_id`
- BE returns analysis; if `saveToDb=true`, stores in DB

3) Chatbot
- FE -> `POST /api/ai/chatbot/start` to get `session_id`
- FE -> `POST /api/ai/chatbot/chat` per message

4) Health/Debug
- FE/Admin -> `GET /api/ai/health`
- Admin -> `GET /api/ai/debug/auth`
