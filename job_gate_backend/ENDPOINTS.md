# Job Gate Backend Endpoints

This document lists all HTTP endpoints exposed by the backend (`job_gate_backend`)
based on `job_gate_backend/app.js` and the route files in `job_gate_backend/src/routes`.

## Base URLs
- API base: `/api`
- Static uploads: `/uploads` (served from `job_gate_backend/uploads`)

## Auth and access notes
- `verifyToken`: requires a valid user JWT (Authorization: Bearer).
- `verifyAdmin`: requires admin privileges (used with `verifyToken`).
- `verifyCompany`: requires company account privileges (used with `verifyToken`).
- Some routes are public (no auth middleware in the route).

## Health
- `GET /api/health` : backend health and AI service config snapshot.

## Auth (Job Seeker)
Base: `/api/auth`
- `POST /login` : login job seeker.
- `POST /register-jobseeker` : register job seeker.
- `POST /forgot-password` : request password reset.
- `POST /reset-password` : reset password.

## Job Seeker APIs
Base: `/api/jop_seeker` (note: `jop` is in the code)

Public:
- `GET /job-postings` : list job postings.
- `GET /job-postings/:id` : job posting details.
- `GET /job-postings/:id/form` : job application form (if any).
- `GET /companies` : list companies.
- `GET /companies/:id` : company details.
- `POST /company-requests` : submit company request (public).

Authenticated (verifyToken):
- `POST /applications` : submit application with CV file (multipart).
- `GET /applications/user` : list current user applications.
- `GET /profile/cv` : list user CVs.
- `PUT /profile/cv` : upload/replace user CV (multipart).
- `POST /saved-jobs/:job_id` : save job.
- `GET /saved-jobs` : list saved jobs.
- `DELETE /saved-jobs/:job_id` : remove saved job.
- `GET /notifications` : list notifications.
- `GET /notifications/:id` : notification details.
- `GET /notifications/unread` : list unread notifications.
- `PUT /notifications/:id/read` : mark notification as read.

## Consultant APIs
Base: `/api/consultant`

Admin:
- `PUT /admin/upgrade/:user_id` : accept/reject consultant upgrade (verifyToken + verifyAdmin).

User (authenticated):
- `POST /user/upgrade` : request consultant upgrade (verifyToken).
- `POST /:user_id/request-consultation` : request consultation (verifyToken).
- `GET /requests` : list incoming consultation requests (verifyToken).
- `PUT /requests/:request_id` : accept/reject consultation request (verifyToken).
- `POST /bookings` : create consultation booking (verifyToken).
- `GET /bookings` : list consultant bookings (verifyToken).
- `DELETE /bookings/:booking_id` : cancel booking (verifyToken).

Public:
- `GET /:user_id` : get consultant profile.
- `GET /` : list all consultants.

## Company Requests (Approval Flow)
Base: `/api/company-requests`

Public:
- `POST /` : create company request.
- `POST /track` : track request status (no login).

Admin (verifyToken + verifyAdmin):
- `GET /` : list company requests.
- `GET /:id` : get request by id.
- `PUT /approve/:id` : approve company request.
- `PUT /reject/:id` : reject company request.

## Companies
Base: `/api/companies`

Public:
- `POST /login` : company login.
- `POST /set-password` : set initial password.
- `POST /register` : register company (pending approval).
- `GET /` : list approved companies.
- `GET /:id` : approved company details.

Admin (verifyToken + verifyAdmin):
- `POST /` : create company.
- `GET /admin/all` : list all companies.
- `GET /admin/:id` : get company by id.
- `PUT /admin/:id` : update company.
- `DELETE /admin/:id` : delete company.

Company dashboard (verifyToken + verifyCompany):
- `PUT /company/change-password` : change company password.
- `GET /company/dashboard` : dashboard summary.
- `GET /company/profile` : company profile.
- `PUT /company/profile` : update company profile (multipart `logo`).
- `GET /company/applications` : list applications to company jobs.
- `GET /company/applications/:id` : application details.
- `PUT /company/applications/:id` : update application status.

Company job postings (verifyToken + verifyCompany):
- `POST /company/job-postings` : create job (multipart `job_image`).
- `GET /company/job-postings` : list company jobs.
- `PUT /company/job-postings/:id` : update job.
- `PUT /company/job-postings/:id/toggle` : toggle job status.
- `DELETE /company/job-postings/:id` : delete job.
- `POST /company/job-forms` : create internal job form.
- `PUT /company/job-postings/:id/form` : update job form.
- `DELETE /company/job-postings/:id/form` : delete job form.

## Admin APIs
Base: `/api/admin`
All routes require `verifyToken` + `verifyAdmin` (via router-level middleware).

Users and jobs:
- `GET /users` : list users.
- `GET /users/:id` : get user.
- `POST /users` : create user.
- `PUT /users/:id` : update user.
- `DELETE /users/:id` : delete user.
- `GET /job-postings` : list all job postings.
- `GET /applications` : list all applications.
- `PUT /applications/:id` : update application status.

CVs:
- `GET /cvs` : list all CVs.
- `GET /cvs/:userId` : get and download user CV.

Email and push:
- `POST /email/send` : send custom email.
- `GET /email` : list sent emails.
- `POST /push/send` : send push notification.
- `GET /push` : list push notifications.

Company requests:
- `GET /company-requests` : list company requests.
- `PUT /company-requests/approve/:id` : approve request.
- `PUT /company-requests/reject/:id` : reject request.
- `DELETE /companies/:id` : delete company.

## Company CV Purchase Requests
Company (verifyToken + verifyCompany):
- `POST /api/company/cv-requests` : create CV purchase request.
- `GET /api/company/cv-requests` : list company CV requests.

Admin (verifyToken):
- `GET /api/admin/cv-requests` : list all CV requests.
- `PUT /api/admin/cv-requests/:id/status` : update request status.
- `POST /api/admin/cv-matching/match/:requestId` : match and deliver CVs (verifyAdmin).

## AI APIs (Backend proxy)
Base: `/api/ai`

Authenticated (verifyToken) unless noted:
- `POST /cv/analyze-text` : analyze CV text.
- `POST /cv/analyze-file` : analyze CV file (multipart `file`).
- `POST /chatbot/start` : start chatbot session.
- `POST /chatbot/chat` : send chatbot message.
- `GET /cv/analysis/:cvId` : get stored CV analysis.
- `GET /user/cvs` : list stored CVs.
- `GET /debug/auth` : AI auth debug + probe.
- `POST /test-connection` : test AI service connection.

Public:
- `GET /health` : AI service health check.

## Email APIs
Base: `/api/email` (verifyToken + verifyAdmin)
- `POST /send` : send email to company (by company_id or email).
- `POST /send/custom` : send custom email.
- `GET /` : list email logs.

## Push Notification APIs
Base: `/api/push` (verifyToken + verifyAdmin)
- `POST /send` : send push to user.
- `GET /` : list sent push notifications.
