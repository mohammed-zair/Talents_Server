# AI Core and Backend Connection

This document explains how the Node.js backend connects to the AI Core service, whether the connection is correct, and the request flow between them.

## Where the connection is defined

Backend (Node.js):
- AI client and auth logic: job_gate_backend/src/services/aiService.js
- API endpoints that call AI: job_gate_backend/src/controllers/ai.controller.js
- API routes: job_gate_backend/src/routes/ai.routes.js

AI Core (FastAPI):
- App and auth middleware: job_gate_ai/app/main.py
- Auth helpers: job_gate_ai/app/core/security.py
- CV analysis endpoints: job_gate_ai/app/api/endpoints/cv_analysis.py
- Chatbot endpoints: job_gate_ai/app/api/endpoints/chatbot.py

## How the backend connects to AI Core

1) Base URL
- Backend reads AI_SERVICE_URL (default: http://localhost:8000) and creates an Axios client.

2) Auth mode
- Backend reads AI_CORE_AUTH_MODE (apikey | jwt | both) and builds headers accordingly.
- If apikey: sends X-API-Key: <AI_CORE_API_KEY>
- If jwt: sends Authorization: Bearer <signed JWT>
- If both: sends both headers

3) Endpoints used by backend
- POST /cv/analyze-text
- POST /cv/analyze
- POST /chatbot/start
- POST /chatbot/chat
- GET /health

These match AI Core routes in the codebase.

## Is the connection correct?

Yes, the endpoint paths, payloads, and auth headers line up correctly.
The connection will work in production as long as the auth settings match on both sides.

Common reasons it fails:
- AI_CORE_AUTH_MODE mismatch between backend and AI Core
- AI_CORE_API_KEY is not set on backend while AI Core expects API keys
- AI_CORE_JWT_SECRET differs between backend and AI Core when using jwt
- AI_SERVICE_URL points to the wrong host or port

## Required config alignment (must match)

Use one of these two setups:

### Option A: API key auth (simple)
Backend .env (job_gate_backend/.env):
- AI_CORE_AUTH_MODE=apikey
- AI_CORE_API_KEY=some-strong-key

AI Core .env (job_gate_ai/.env):
- AI_CORE_AUTH_MODE=apikey
- API_KEYS=some-strong-key

### Option B: JWT auth (recommended)
Backend .env (job_gate_backend/.env):
- AI_CORE_AUTH_MODE=jwt
- AI_CORE_JWT_SECRET=shared-strong-secret
- AI_CORE_JWT_ISSUER=jobgate-backend
- AI_CORE_JWT_AUDIENCE=jobgate-ai-core
- AI_CORE_JWT_TTL_SECONDS=60

AI Core .env (job_gate_ai/.env):
- AI_CORE_AUTH_MODE=jwt
- AI_CORE_JWT_SECRET=shared-strong-secret
- AI_CORE_JWT_ISSUER=jobgate-backend
- AI_CORE_JWT_AUDIENCE=jobgate-ai-core

## Request flow (AI analysis)

1) Client sends CV text or file to Node backend.
2) Backend validates auth and request payload.
3) Backend sends request to AI Core:
   - CV text: POST /cv/analyze-text with JSON body { user_id, cv_text, use_ai }
   - CV file: POST /cv/analyze with multipart form-data and query params { user_id, use_ai }
4) AI Core parses CV, scores ATS, and returns structured data.
5) Backend normalizes the response and saves:
   - CV record
   - CV structured data
   - CV analytics
6) Backend responds to the client.

## Request flow (chatbot)

1) Client asks to start a chatbot session.
2) Backend calls POST /chatbot/start with { user_id, language, initial_data }.
3) AI Core creates a session and returns session_id + message.
4) Client sends messages to backend.
5) Backend calls POST /chatbot/chat with { session_id, message }.
6) AI Core updates session and returns assistant reply.

## Health check and debug

Backend exposes:
- GET /api/ai/health (proxy to AI Core /health)
- GET /api/ai/debug/auth (shows auth mode and does a probe)

Use these to confirm the connection before going live.

## Recommended production notes
- Do not expose AI Core directly to the public internet.
- Allow only backend-to-AI traffic on the network or firewall.
- Use jwt auth for service-to-service authentication.
- Rotate secrets regularly.