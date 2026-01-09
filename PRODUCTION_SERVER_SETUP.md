# Job Gate Production Server Setup

This checklist covers what to install, security requirements, and which server-side files to create after pulling the repo. It is based on the current code in this repository.

## Services
- job_gate_admin: React SPA (static files)
- job_gate_backend: Node/Express API
- job_gate_ai: FastAPI AI core

## Required installs (production host)
- OS packages: git, curl, unzip, build-essential, ufw
- Node.js 18+ LTS and npm (or yarn)
- Python 3.11 + pip + venv
- MySQL 8.x (or compatible)
- Nginx (reverse proxy + static hosting)
- Optional: PM2 or systemd (process supervision)
- Optional: certbot (TLS automation)
- Optional: Docker + docker-compose (if you prefer containerizing AI core)

## Files to create after pulling the repo
Create these on the server and keep secrets out of git.

### job_gate_admin
- job_gate_admin/.env (optional but recommended)
  - REACT_APP_API_BASE_URL=https://api.example.com/api

### job_gate_backend
- job_gate_backend/.env
- job_gate_backend/src/config/firebase-admin.json (Firebase service account)
- job_gate_backend/uploads/
- job_gate_backend/uploads/cvs/
- Optional log directory (example): /var/log/job_gate_backend/

### job_gate_ai
- job_gate_ai/.env
- job_gate_ai/chatbot_sessions.json (or set CHATBOT_SESSIONS_FILE to a path you create)
- job_gate_ai/jobgate.db (only if you keep the default sqlite database)
- Optional generated files directory: job_gate_ai/generated_cvs/
- Optional log directory (example): /var/log/job_gate_ai/

### System-level files (outside the repo)
- Nginx site config (example): /etc/nginx/sites-available/job_gate
- systemd unit files (example):
  - /etc/systemd/system/job-gate-backend.service
  - /etc/systemd/system/job-gate-ai.service

## Environment variables (reference)

### job_gate_backend/.env
```
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://admin.example.com
FRONTEND_URL=https://admin.example.com
FRONT_URL=https://admin.example.com

DB_HOST=127.0.0.1
DB_NAME=job_gate
DB_USER=job_gate_user
DB_PASS=strong-password

JWT_SECRET=very-strong-secret
JWT_EXPIRES_IN=1d
RESET_PASSWORD_TOKEN_EXPIRES_MIN=30

ENABLE_AI_FEATURES=true
AI_SERVICE_URL=http://127.0.0.1:8000
AI_CORE_AUTH_MODE=jwt
AI_CORE_JWT_SECRET=very-strong-secret
AI_CORE_JWT_ISSUER=jobgate-backend
AI_CORE_JWT_AUDIENCE=jobgate-ai-core
AI_CORE_JWT_TTL_SECONDS=60
AI_CORE_API_KEY=your-ai-api-key-if-using-apikey
AI_SERVICE_TIMEOUT=30000
AI_SERVICE_MAX_RETRIES=2
AI_SERVICE_RETRY_DELAY_MS=500

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp-user
SMTP_PASS=smtp-pass
SMTP_FROM_NAME=Job Gate
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_REQUIRE_TLS=true
SMTP_POOL=true
SMTP_MAX_CONNECTIONS=5
SMTP_MAX_MESSAGES=100
SMTP_CONN_TIMEOUT=10000
SMTP_GREET_TIMEOUT=10000
SMTP_SOCKET_TIMEOUT=20000

DB_SYNC_ALTER=false
DB_SYNC_FORCE=false
```

### job_gate_ai/.env
```
DEBUG=false
API_PORT=8000
CORS_ORIGINS=https://admin.example.com,https://app.example.com

OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key-if-used
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=deepseek/deepseek-chat

API_KEYS=comma-separated-keys
AI_CORE_AUTH_MODE=jwt
AI_CORE_JWT_SECRET=very-strong-secret
AI_CORE_JWT_ISSUER=jobgate-backend
AI_CORE_JWT_AUDIENCE=jobgate-ai-core

MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document

DATABASE_URL=sqlite:///./jobgate.db
SQL_ECHO=false
CHATBOT_SESSIONS_FILE=/var/lib/job_gate_ai/chatbot_sessions.json
```

### job_gate_admin/.env (optional)
```
REACT_APP_API_BASE_URL=https://api.example.com/api
```

## Security requirements (production)
- TLS everywhere: terminate HTTPS at Nginx and redirect HTTP to HTTPS.
- Firewall: allow only 22, 80, 443; block direct access to 5000/8000.
- Run services as non-root users with minimal permissions.
- Strong secrets for JWT and API keys; rotate regularly.
- Do not use wildcard CORS in production; set exact origins.
- Disable debug modes: NODE_ENV=production and DEBUG=false.
- Restrict AI core access to the backend only (internal network or firewall).
- Protect uploads: limit file size, validate MIME types, and store outside web root.
- Secure MySQL: least-privilege user, strong password, regular backups.
- Log and monitor: enable access/error logs and rotate them.
- Keep dependencies updated and patch the OS regularly.

## Minimal deployment outline (non-Docker)
1) Build admin: `cd job_gate_admin && npm ci && npm run build`.
2) Install backend deps: `cd job_gate_backend && npm ci`.
3) Create venv and install AI deps: `cd job_gate_ai && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt` (Windows) or `.venv/bin/pip` (Linux).
4) Configure Nginx to serve `job_gate_admin/build` and proxy `/api` to backend.
5) Run backend and AI with systemd (or PM2 for Node, uvicorn for AI core).

If you want, I can add systemd unit templates and an example Nginx config to this doc.