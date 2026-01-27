# Talents CV Import Invite Updates

Date: 2026-01-27

## Goal
Automate invites by analyzing CV files in the import folder, extracting structured data
(e.g., `personal_info.email`, `personal_info.name`), creating users, and sending invites
to the same email.

## What Was Added
- AI-based CV analysis during import to extract structured data.
- Structured data parsing to prefer `personal_info.email` and `personal_info.name`.
- Structured data persistence in `cv_structured_data.data_json`.
- Fallback to regex email extraction if AI analysis fails.

## Files Changed
- `job_gate_backend/src/controllers/talentsEmail.controller.js`

## Flow Summary (Import + Invite)
1. Read CV files from `job_gate_backend/uploads/cv_imports` (PDF/DOCX).
2. Extract raw text from the CV file.
3. Send text to AI Core (`/cv/analyze-text`) to get structured data.
4. Prefer email/name from structured data; fallback to regex email.
5. Create user if the email does not exist.
6. Store CV record + structured JSON in `cv_structured_data`.
7. Send invite email to newly created users.

## Notes / Dependencies
- AI Core must be reachable:
  - `AI_SERVICE_URL`
  - `AI_CORE_AUTH_MODE`
  - `AI_CORE_API_KEY` or `AI_CORE_JWT_SECRET` (based on auth mode)
- If AI Core is unavailable, the import still proceeds with regex email extraction.

