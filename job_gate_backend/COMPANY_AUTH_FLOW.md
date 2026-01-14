# Company Registration & Login Flow

Base path:

`/api/companies`

## Public (No Auth)

### Register Company

`POST /api/companies/register`

Required body fields:

- `name`
- `email`
- `license_doc_url`
- `password`
- `confirm_password`

Optional:

- `phone`
- `description`
- `logo_url`

Error (missing body):

- `400` with `{ message: "Request body is required." }` when no JSON body is sent

Response (success):

- `{ company_id, status }` where `status` is `pending|approved|rejected`

### Login Company

`POST /api/companies/login`

Body:

- `email`
- `password`

Response (success):

- `{ token, company: { company_id, name, email } }`

### Set Password (Token-Based)

`POST /api/companies/set-password`

Body:

- `token`
- `password`

Use when the company account has a valid `set_password_token`.

### Public Company Listings

`GET /api/companies`

List approved companies only.

`GET /api/companies/:id`

Get approved company details only.

## Admin (Requires Admin Token)

### Company Requests

`GET /api/admin/company-requests`

Lists all company requests (pending/approved/rejected).

`PUT /api/admin/company-requests/approve/:id`

Approves a company request.

`PUT /api/admin/company-requests/reject/:id`

Rejects a company request.

Body:

- `admin_review_notes` (required)

## Company Private (Requires Company Token)

Send:

`Authorization: Bearer <token>`

Endpoints:

- `GET /api/companies/company/dashboard`
- `GET /api/companies/company/profile`
- `PUT /api/companies/company/profile` (multipart, `logo`)
- `PUT /api/companies/company/change-password`

Job postings, applications, and other company features are under `/api/companies/company/*`.

## Flow Summary

1) Company registers with `POST /api/companies/register` -> status `pending`.
2) Admin approves via `PUT /api/admin/company-requests/approve/:id`.
3) Company logs in with `POST /api/companies/login` -> receives JWT token.
4) Company accesses private endpoints with `Authorization: Bearer <token>`.
