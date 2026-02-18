# Job Seeker Backend Feature Coverage

This dashboard connects the following backend seeker/auth/AI features.

## Authentication
- `POST /api/auth/login` -> Login page
- `POST /api/auth/register-jobseeker` -> Registration page
- `POST /api/auth/forgot-password` -> Forgot password page
- `POST /api/auth/reset-password` -> Reset password page

## Job Seeker Core (`/api/jop_seeker`)
- `GET /job-postings` -> Opportunity Map list
- `GET /job-postings/:id` -> Job details fetch helper
- `GET /job-postings/:id/form` -> Dynamic application form helper
- `POST /applications` -> Quick Apply + manual apply
- `GET /applications/user` -> Applications page + Pulse funnel
- `GET /profile/cv` -> CV Lab list
- `PUT /profile/cv` -> CV Lab upload
- `DELETE /profile/cv/:id` -> CV Lab delete
- `POST /saved-jobs/:job_id` -> Opportunity card save
- `GET /saved-jobs` -> Profile saved jobs list
- `DELETE /saved-jobs/:job_id` -> Profile remove saved
- `GET /notifications` -> Profile notifications
- `GET /notifications/unread` -> unread helper
- `PUT /notifications/:id/read` -> mark read
- `GET /companies` -> Market page (approved companies only)
- `GET /companies/:id` -> company detail helper

## AI (`/api/ai`)
- `POST /cv/analyze-text` -> CV Lab AI analysis helper
- `POST /cv/analyze-file` -> CV Lab file analysis helper
- `GET /cv/analysis/:cvId` -> CV Lab insights panel
- `GET /user/cvs` -> seeker AI CV inventory helper
- `POST /cv/generate-pitch` -> Opportunity quick apply smart pitch
- `POST /chatbot/start` -> AI Consultant session start
- `POST /chatbot/chat` -> AI Consultant messaging
- `GET /chatbot/sessions` -> AI Consultant session list
- `GET /chatbot/session/:sessionId` -> AI session details helper
- `POST /chatbot/export` -> CV export helper (pdf/docx)

## Consultant Marketplace (`/api/consultant`)
- `GET /` -> consultant list page
- `GET /:user_id` -> consultant detail helper
- `POST /:user_id/request-consultation` -> request action
- `POST /bookings` -> 15-minute booking action
- `DELETE /bookings/:booking_id` -> cancellation helper

## Notes
- Token auth uses `Authorization: Bearer <token>` from localStorage.
- API response unwrapping handles both `{ data: ... }` and direct payloads.
- Sidebar pages are mapped to this backend coverage in `src/App.tsx`.