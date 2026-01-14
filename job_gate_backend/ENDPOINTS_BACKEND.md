# Backend Endpoints

Base path:

`/api`

## Health

- `GET /api/health`

## Auth (`/api/auth`)

- `POST /api/auth/login`
- `POST /api/auth/register-jobseeker`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Job Seeker (`/api/jop_seeker`)

Note: base path uses `jop_seeker`.

- `GET /api/jop_seeker/job-postings`
- `GET /api/jop_seeker/job-postings/:id`
- `GET /api/jop_seeker/companies`
- `GET /api/jop_seeker/companies/:id`
- `POST /api/jop_seeker/company-requests`
- `POST /api/jop_seeker/applications` (auth)
- `GET /api/jop_seeker/applications/user` (auth)
- `GET /api/jop_seeker/profile/cv` (auth)
- `PUT /api/jop_seeker/profile/cv` (auth, multipart)
- `POST /api/jop_seeker/saved-jobs/:job_id` (auth)
- `GET /api/jop_seeker/saved-jobs` (auth)
- `DELETE /api/jop_seeker/saved-jobs/:job_id` (auth)
- `GET /api/jop_seeker/notifications` (auth)
- `GET /api/jop_seeker/notifications/:id` (auth)
- `GET /api/jop_seeker/notifications/unread` (auth)
- `PUT /api/jop_seeker/notifications/:id/read` (auth)
- `GET /api/jop_seeker/job-postings/:id/form`

## Companies (`/api/companies`)

Public:

- `POST /api/companies/register`
- `POST /api/companies/login`
- `POST /api/companies/set-password`
- `GET /api/companies`
- `GET /api/companies/:id`

Admin:

- `POST /api/companies` (admin)
- `GET /api/companies/admin/all` (admin)
- `GET /api/companies/admin/:id` (admin)
- `PUT /api/companies/admin/:id` (admin)
- `DELETE /api/companies/admin/:id` (admin)

Company:

- `PUT /api/companies/company/change-password` (company auth)
- `GET /api/companies/company/dashboard` (company auth)
- `GET /api/companies/company/profile` (company auth)
- `PUT /api/companies/company/profile` (company auth, multipart)
- `GET /api/companies/company/applications` (company auth)
- `GET /api/companies/company/applications/:id` (company auth)
- `PUT /api/companies/company/applications/:id` (company auth)
- `POST /api/companies/company/job-postings` (company auth, multipart)
- `GET /api/companies/company/job-postings` (company auth)
- `PUT /api/companies/company/job-postings/:id` (company auth)
- `PUT /api/companies/company/job-postings/:id/toggle` (company auth)
- `DELETE /api/companies/company/job-postings/:id` (company auth)
- `POST /api/companies/company/job-forms` (company auth)
- `PUT /api/companies/company/job-postings/:id/form` (company auth)
- `DELETE /api/companies/company/job-postings/:id/form` (company auth)

## Company Requests (`/api/company-requests`)

- `POST /api/company-requests`
- `POST /api/company-requests/track`
- `GET /api/company-requests` (admin)
- `GET /api/company-requests/:id` (admin)
- `PUT /api/company-requests/approve/:id` (admin)
- `PUT /api/company-requests/reject/:id` (admin)

## Admin (`/api/admin`)

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/job-postings`
- `GET /api/admin/applications`
- `PUT /api/admin/applications/:id`
- `GET /api/admin/cvs`
- `GET /api/admin/cvs/:userId`
- `POST /api/admin/email/send`
- `GET /api/admin/email`
- `POST /api/admin/push/send`
- `GET /api/admin/push`
- `GET /api/admin/company-requests`
- `PUT /api/admin/company-requests/approve/:id`
- `PUT /api/admin/company-requests/reject/:id`
- `DELETE /api/admin/companies/:id`

## Consultant (`/api/consultant`)

- `PUT /api/consultant/admin/upgrade/:user_id` (admin)
- `POST /api/consultant/user/upgrade` (auth)
- `GET /api/consultant/:user_id`
- `GET /api/consultant`
- `POST /api/consultant/:user_id/request-consultation` (auth)
- `GET /api/consultant/requests` (auth)
- `PUT /api/consultant/requests/:request_id` (auth)
- `POST /api/consultant/bookings` (auth)
- `GET /api/consultant/bookings` (auth)
- `DELETE /api/consultant/bookings/:booking_id` (auth)

## Company CV Requests

Company:

- `POST /api/company/cv-requests` (company auth)
- `GET /api/company/cv-requests` (company auth)

Admin:

- `GET /api/admin/cv-requests`
- `PUT /api/admin/cv-requests/:id/status`
- `POST /api/admin/cv-matching/match/:requestId`

## AI Proxy (`/api/ai`)

- `POST /api/ai/cv/analyze-text` (auth)
- `POST /api/ai/cv/analyze-file` (auth, multipart)
- `POST /api/ai/chatbot/start` (auth)
- `POST /api/ai/chatbot/chat` (auth)
- `GET /api/ai/cv/analysis/:cvId` (auth)
- `GET /api/ai/health`
- `GET /api/ai/debug/auth` (auth)
- `POST /api/ai/test-connection` (auth)
- `GET /api/ai/user/cvs` (auth)

## Push (`/api/push`)

- `POST /api/push/send` (admin)
- `GET /api/push` (admin)

## Email (`/api/email`)

- `POST /api/email/send` (admin)
- `POST /api/email/send/custom` (admin)
- `GET /api/email` (admin)
