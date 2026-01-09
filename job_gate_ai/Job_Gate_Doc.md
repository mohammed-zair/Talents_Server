**Job Gate — Architecture & Developer Guide**

This document describes the Job Gate AI Core, how the interactive chatbot builder works, and how users can finalize and download their CVs as editable DOCX files. It includes design notes, example endpoints, a sample `DocumentGenerator` implementation using `python-docx`, and frontend integration guidance.

**Contents**
- Overview
- Chatbot builder flow
- Finalization & DOCX export (how it works)
- API: suggested endpoints for export and download
- Server-side document generation (example code)
- Frontend integration (how to trigger download)
- Security & storage considerations
- Troubleshooting & testing

**Overview**
Job Gate AI Core provides CV parsing, ATS scoring, and an interactive chatbot that helps users create and refine CVs. The chatbot maintains a structured CV JSON object for each session. When the user marks the CV as "final" or requests a download, the system renders that structured data to a downloadable document (DOCX or PDF).

**Chatbot builder flow**
- The chatbot gathers user inputs step-by-step and stores them in a session object (in memory, Redis, or database depending on deployment).
- At any time the user may request a preview or to export the current CV.
- When the user finishes the builder flow, the frontend signals the backend (Node.js or directly to AI Core) to export the CV. That call includes either the session id or the structured CV JSON.

**Finalization & DOCX export (how it works)**
1. Finalize state: the frontend informs the server the user has finished the CV (e.g., POST `/builder/finalize` or a similar endpoint).
2. Persist structured CV: the server saves the final structured CV in the database (or uses an existing `analysis_id`).
3. Render DOCX: the server calls a `DocumentGenerator` service which:
   - Accepts the structured CV JSON and a template name (optional)
   - Renders sections (personal info, experience, education, projects, skills, languages, summary)
   - Produces a `docx` file (using `python-docx` or `docxtpl`) and writes it to `generated_cvs/` or streams it back
4. Return file: the server responds with either a direct file download (StreamingResponse) or a signed/temporary URL to the stored file.

Notes:
- Use `python-docx` (already in `requirements.txt`) for programmatic DOCX creation.
- For templating with variable places and repeated blocks (experience list), consider `docxtpl` (template + jinja-like rendering). If advanced layouts or RTL (Arabic) handling is required, test templates carefully — some Word features have limited programmatic control.

**API: suggested endpoints for export and download**
Add these endpoints (example):

- POST /cv/export
  - Body: { "analysis_id": "..." } OR { "structured_data": { ... }, "template": "modern" }
  - Behavior: generates DOCX (or pdf) and returns `{ "download_url": "/cv/download/{file_id}" }` or streams file directly.

- GET /cv/download/{file_id}
  - Returns: Content-Disposition attachment with file bytes
  - Authorization: verify user owns `file_id` or has rights

Example FastAPI endpoint (stream file back directly):

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.document_generator import DocumentGenerator
import io

router = APIRouter()

@router.post('/cv/export')
async def export_cv(payload: dict):
    # payload must contain either 'analysis_id' or 'structured_data'
    structured = payload.get('structured_data')
    if not structured and payload.get('analysis_id'):
        # load from DB (pseudo)
        structured = await load_structured_from_db(payload['analysis_id'])

    if not structured:
        raise HTTPException(status_code=400, detail='No structured CV provided')

    # Render docx in-memory
    docx_bytes = DocumentGenerator.render_docx_bytes(structured)
    file_like = io.BytesIO(docx_bytes)
    filename = f"cv_{structured.get('personal_info', {}).get('name','candidate')}.docx"

    return StreamingResponse(
        file_like,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )
```

**Server-side document generation (example implementation)**
Below is a simple `DocumentGenerator` example using `python-docx`. Put this in `app/services/document_generator.py` if you decide to implement it.

```python
from docx import Document
from docx.shared import Pt
import io

class DocumentGenerator:
    @staticmethod
    def render_docx_bytes(structured_cv: dict) -> bytes:
        doc = Document()

        # Title / Name
        name = structured_cv.get('personal_info', {}).get('name', 'Candidate')
        p = doc.add_paragraph()
        run = p.add_run(name)
        run.bold = True
        run.font.size = Pt(16)

        # Contact
        contact = []
        pi = structured_cv.get('personal_info', {})
        if pi.get('email'):
            contact.append(pi['email'])
        if pi.get('phone'):
            contact.append(pi['phone'])
        if pi.get('location'):
            contact.append(pi['location'])

        if contact:
            doc.add_paragraph(' | '.join(contact))

        # Summary
        if structured_cv.get('summary'):
            doc.add_heading('Summary', level=2)
            doc.add_paragraph(structured_cv['summary'])

        # Experience
        if structured_cv.get('experience'):
            doc.add_heading('Experience', level=2)
            for exp in structured_cv['experience']:
                title = exp.get('title') or exp.get('job') or ''
                company = exp.get('company', '')
                period = exp.get('period', '')
                p = doc.add_paragraph()
                p.add_run(f"{title} — ").bold = True
                p.add_run(f"{company} | {period}")
                for ach in exp.get('achievements', [])[:10]:
                    doc.add_paragraph(f"• {ach}", style='List Bullet')

        # Education
        if structured_cv.get('education'):
            doc.add_heading('Education', level=2)
            for ed in structured_cv['education']:
                doc.add_paragraph(f"{ed.get('degree','')} — {ed.get('school','')} ({ed.get('years','')})")

        # Skills
        if structured_cv.get('skills'):
            doc.add_heading('Skills', level=2)
            doc.add_paragraph(', '.join(structured_cv['skills']))

        # Projects (if present)
        if structured_cv.get('projects'):
            doc.add_heading('Projects', level=2)
            for proj in structured_cv['projects']:
                doc.add_paragraph(proj.get('title',''))
                if proj.get('description'):
                    doc.add_paragraph(proj['description'])

        # Save to bytes
        f = io.BytesIO()
        doc.save(f)
        f.seek(0)
        return f.read()
```

Notes about this implementation:
- It creates a simple, editable Word document. You can add templates, custom styles, fonts and RTL handling.
- Test the generated documents with Word and LibreOffice to ensure layout and Arabic rendering if needed.

**Frontend integration (how to trigger and download)**
1. Finalize step in UI: when user clicks "Finalize and download" in the chatbot UI, the frontend sends the finalized structured CV to your backend or Node.js gateway (e.g., POST `/api/cv/export`).
2. Handle response:
   - If the backend returns a `download_url` (signed temporary URL), the frontend sets `window.location.href = download_url` or opens it in a new tab.
   - If the backend streams the file directly, the browser will automatically download it because of the `Content-Disposition` header.

Example (JavaScript fetch + download):

```javascript
async function downloadCV(structured) {
  const res = await fetch('/api/cv/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structured_data: structured })
  });

  // If backend streams file, just redirect to endpoint that returns file
  if (res.ok) {
    // If response is a file stream, you can use blob download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cv.docx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } else {
    const err = await res.json();
    console.error('Export error', err);
  }
}
```

**Security & storage considerations**
- Authorization: only authenticated users should be able to export/download CVs. Validate ownership of `analysis_id` or session.
- Temporary URLs: if you store generated files and return a URL, ensure the URL is short‑lived or requires a token.
- Cleanup: schedule background tasks to remove old files from `generated_cvs/` (e.g., older than 7 days) to avoid disk growth.
- Filenames: sanitize user-provided names to avoid directory traversal or bad characters.

**Testing & debugging**
- Manual test via Swagger UI: call POST `/cv/export` with a sample structured JSON and verify the `.docx` downloads and opens.
- PowerShell test (download streamed file):

```powershell
$body = @{ structured_data = (Get-Content -Raw .\scripts\sample_structured.json | ConvertFrom-Json) } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/cv/export -Method Post -Body $body -ContentType 'application/json' -OutFile C:\tmp\candidate_cv.docx
```

**Deployment notes**
- `python-docx` is included in `requirements.txt`. If you switch to `docxtpl` add it to `requirements.txt` and test template rendering.
- If your service should handle high export throughput, do DOCX generation in a background worker (Celery/RQ) and return a ready callback or signed URL when complete.

**Where to go next (implementation options)**
- Quick: implement `POST /cv/export` that streams a `docx` directly (synchronous). Good for single small requests.
- Scalable: enqueue an export job, return a job id, and allow the frontend to poll or receive a WebSocket notification with a download URL.

If you want, I can implement the `DocumentGenerator` service and the `POST /cv/export` endpoint in the codebase now, add a small test file and a PowerShell test script to `scripts/`. Tell me whether you prefer synchronous streaming or background job flow and I will implement it.

---

End of document.
System Architecture
How Everything Fits Together
We built Job Gate with a microservices approach. Here's how it works:

Three Main Parts:

Frontend - What users see (web/mobile apps)

Main Backend (Node.js) - Handles users, auth, and business logic

AI Core (Python) - Does all the smart CV processing

How Requests Flow
User uploads a CV → Frontend sends to Node.js backend

Node.js checks who they are → Validates login/session

Node.js sends to AI Core → Forwards the CV file with API key

AI Core processes it → Extracts text, analyzes with AI, scores it

AI Core sends back results → Structured data + ATS score

Node.js saves and responds → Stores in database, returns to frontend

User sees the analysis → Frontend displays the results

What the AI Core Can Do
1. CV Analysis Engine
For uploaded files (PDF/DOCX):

Extracts text from any CV format

Identifies personal info (name, email, phone)

Pulls out work experience and education

Lists all skills mentioned

Finds achievements and certifications

ATS Scoring System:
We check CVs against what automated systems look for:

✓ Contact information present

✓ Work experience section exists

✓ Education details included

✓ Skills properly listed

✓ Achievements with numbers/results

✓ Proper formatting and structure

Score: 0-100 (higher is better for automated screening)

AI-Powered Parsing:
When possible, we use DeepSeek AI (through OpenRouter) to:

Understand context in CVs

Handle different formats and layouts

Work with Arabic and English equally well

Extract subtle details and relationships

Fallback System:
If AI isn't available, we use smart rules to:

Find emails and phone numbers

Identify common skills

Extract education and experience

Still give a decent ATS score

2. Interactive CV Builder
How the Conversation Works:

User says they want to build a CV

AI asks questions step by step:

"What's your full name?"

"What's your email?"

"Tell me about your work experience"

AI remembers everything and builds the CV gradually

User can go back and edit any part

Smart Content Generation:
Instead of just copying what users say, the AI:

Makes descriptions more professional

Adds achievement-focused language

Includes numbers and results where possible

Formats everything properly

Suggests improvements as they go

Progress Tracking:
The system shows users:

How much of their CV is complete

What sections are missing

Suggestions for what to add next

Estimated time to completion

3. Document Export System
Multiple Formats:

PDF - Ready to print or email

DOCX - Editable in Word

Templates - Different professional designs

Smart Formatting:

Handles Arabic right-to-left properly

Professional typography and spacing

ATS-friendly layouts

Mobile-responsive designs

Technical Details for Integration
How to Connect to AI Core
From Node.js Backend:

Setup the connection:

URL: http://ai-core:8000 (inside Docker) or your deployed URL

API Key: Must send X-API-Key header with every request

Timeout: 30 seconds is safe for most operations

Sending a CV for analysis:

javascript
// Example flow in Node.js
// 1. Get file from user
// 2. Forward to AI Core
// 3. Get back structured data
// 4. Save to your database
// 5. Return to frontend
Handling responses:

Success: Returns structured CV data with scores

Errors: Clear error messages with suggested fixes

Progress: Can add WebSocket for real-time updates

What Data You Get Back
CV Analysis Response:

json
{
  "success": true/false,
  "structured_data": {
    "personal_info": { "name": "...", "email": "...", "phone": "..." },
    "education": [ { "degree": "...", "school": "...", "years": "..." } ],
    "experience": [ { "job": "...", "company": "...", "achievements": [...] } ],
    "skills": ["Python", "JavaScript", "Project Management"],
    "achievements": ["Increased sales by 40%", "Managed team of 10"],
    "certifications": ["AWS Certified", "Project Management Professional"]
  },
  "ats_score": 85.5,
  "features": {
    "key_skills": ["Python", "JavaScript"],
    "total_years_experience": 5.5,
    "achievement_count": 8,
    "has_quantifiable_results": true
  },
  "processing_time": 2.3,
  "error_message": null
}
Builder Session Response:

json
{
  "session_id": "unique-session-id",
  "current_state": "asking_for_experience",
  "message": "Great! Now tell me about your work experience...",
  "next_questions": ["What was your job title?", "Which company?"],
  "cv_preview": { /* current CV data */ },
  "progress": 45
}
Error Handling
Common Issues and Solutions:

File too large → Limit to 10MB, compress if needed

Wrong file type → Only PDF and DOCX supported

AI service down → Falls back to rule-based parsing

Network problems → Retry logic in Node.js

Session expired → Start new builder session

Error Response Format:

json
{
  "success": false,
  "error": "File is too large",
  "error_code": "FILE_TOO_LARGE",
  "details": { "max_size": "10MB", "your_size": "15MB" },
  "suggested_action": "Compress the file or upload a smaller version"
}
Performance & Scaling
How Fast It Works
Typical Processing Times:

Small CV (1-2 pages): 2-5 seconds

Medium CV (3-5 pages): 5-10 seconds

Complex CV + AI analysis: 10-15 seconds

Builder conversation: Instant responses

Document export: 1-3 seconds

What Affects Speed:

File size and complexity

AI service response time

Current server load

Network conditions

Scaling for More Users
Current Capacity:

Can handle ~100 CVs processing simultaneously

Builder sessions: Thousands concurrent

Memory usage: ~2GB per instance

Storage: Temporary files cleaned automatically

Scaling Options:

Add more AI Core instances - Simple, just launch more copies

Use bigger servers - More CPU/RAM for complex CVs

Implement queues - For very high volume

Add caching - For repeated similar requests

Monitoring & Health Checks
What We Monitor:

Are all services running?

How long do requests take?

Are errors increasing?

Is memory/CPU OK?

Are external APIs (DeepSeek) working?

Health Check Endpoint:
GET /health returns:

Service status

Database connectivity

AI service availability

Current load

Setup & Configuration
What You Need to Run It
Environment Variables:

bash

Python 3.11+


Redis (optional, for caching)

Docker (for easy deployment)

Deployment Options
Simple (Docker):

bash
# Build and run
docker-compose build
docker-compose up

# What this gives you:
# - AI Core on port 8000
# - Database ready
# - File storage setup
# - Automatic restarts
Advanced (Kubernetes):

Multiple instances for reliability

Automatic scaling

Load balancing

Rolling updates

Better monitoring

Cloud (AWS/Azure/GCP):

Container services

Managed databases

Auto-scaling groups

Load balancers

Monitoring dashboards

For Different Team Members
Frontend Team:
You talk to Node.js backend only

Use these endpoints for CV features:

/api/cv/upload - Upload and analyze CV

/api/builder/start - Start CV building

/api/builder/chat - Continue conversation

/api/cv/export - Get PDF/DOCX

Handle file uploads with progress bars

Show ATS scores visually

Implement real-time builder chat UI

Backend (Node.js) Team:
You're the gateway to AI Core

Responsibilities:

User authentication

Session management

Calling AI Core APIs

Database operations

Error handling

Implementation tips:

Use connection pooling to AI Core

Implement retry logic

Add request logging

Cache frequent responses

Monitor response times

DevOps Team:
Deployment and monitoring

Key metrics to watch:

Response time P95

Error rate percentage

AI service availability

Database performance

Memory/CPU usage

Scaling triggers:

CPU > 70% for 5 minutes

Memory > 80% usage

Queue length > 50

Error rate > 5%

Common Use Cases & Examples
1. User Uploads Existing CV
text
User → Uploads PDF → Node.js → AI Core → Analysis → Results → User
Time: ~5-10 seconds
Result: Structured data + ATS score + suggestions
2. Building CV from Scratch
text
User → Starts builder → AI asks questions → User answers → AI builds → Repeat
Time: 10-30 minutes conversation
Result: Complete professional CV ready to export
3. Company Screening CVs
text
Company → Uploads job requirements → System filters CVs → Shows matches
Uses: ATS scores, skills matching, experience levels
4. Improving Existing CV
text
User → Uploads CV → AI suggests improvements → User accepts → New version
Focus: Better wording, more achievements, ATS optimization
Troubleshooting Guide
When Things Go Wrong
CV Won't Upload:

Check file size (<10MB)

Verify file type (PDF or DOCX)

Try a different file

Check network connection

Analysis Takes Too Long:

Try without AI (use_ai=false)

Check AI service status

Reduce file size

Contact support if persists

Builder Not Responding:

Check session hasn't expired

Restart builder session

Clear browser cache

Try different browser

No ATS Score:

CV might be too simple

Missing key sections

Try AI analysis instead of fallback

Check if text was extracted properly

Getting Help
For Integration Issues:

Check API documentation

Verify environment variables

Test with sample CVs first

Look at error logs

For Production Issues:

Check health endpoints

Monitor error rates

Review system logs

Contact operations team

For Feature Requests:

Submit through product team

Include use case details

Priority based on user impact