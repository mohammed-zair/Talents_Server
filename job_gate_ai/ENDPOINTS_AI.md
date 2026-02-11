# AI Core Endpoints

Base path:

`/`

## Public

- `GET /`
- `GET /health`
- `GET /debug/auth`
- `POST /test-cv`

## Protected (AI Auth)

### CV Analysis (`/cv`)

- `POST /cv/analyze`
- `POST /cv/analyze-text`
- `GET /cv/history/{user_id}`
- `GET /cv/status`
- `GET /cv/features/{cv_id}`

### Chatbot (`/chatbot`)

- `POST /chatbot/start`
- `POST /chatbot/chat`
- `GET /chatbot/session/{session_id}`
- `GET /chatbot/sessions?user_id=...`
- `POST /chatbot/export`

### Interactive Builder (`/builder`)

- `POST /builder/start`
- `POST /builder/chat`
- `POST /builder/generate-section`
- `GET /builder/session/{user_id}`

### Export (`/export`)

- `GET /export/health`
