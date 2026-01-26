# Generate Users From CV Imports

## Changes
- Added a CV import workflow that scans `job_gate_backend/uploads/cv_imports` for PDF/DOCX files, extracts the first email, and creates a seeker user only when an email is found.
- Generates a 10-character random password per created user, sends it via the Talents Email service, and stores the hashed password.
- Persists basic extracted data in `CV` + `CVStructuredData` (email, source file, extracted timestamp).
- Deletes each CV file after successful processing; files without emails are skipped.
- Added PDF/DOCX text extraction utilities and dependencies (`pdf-parse`, `mammoth`).

## Endpoints
- `POST /api/admin/talents/import-cvs` — process CVs in the import folder and create users (admin protected).
- `POST /api/admin/talents/invite-emails` — existing endpoint used to send emails (unchanged).
