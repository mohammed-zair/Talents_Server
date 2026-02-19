from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict
import uuid
import json
import logging
import os
import re
from datetime import datetime

from app.services.llm_service import LLMService
from app.services.database_service import DatabaseService
from app.services.document_generator import DocumentGenerator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

db = DatabaseService()
document_generator = DocumentGenerator()


class ChatbotStartRequest(BaseModel):
    model_config = ConfigDict(coerce_numbers_to_str=True)
    user_id: str
    language: str = "english"
    output_language: Optional[str] = None
    initial_data: Dict[str, Any] = {}
    job_description: Optional[str] = None
    job_posting: Optional[Dict[str, Any]] = None


class ChatbotMessageRequest(BaseModel):
    session_id: str
    message: str
    job_description: Optional[str] = None
    job_posting: Optional[Dict[str, Any]] = None


class ChatbotExportRequest(BaseModel):
    session_id: str
    format: str = "pdf"
    language: Optional[str] = None


class ChatbotSessionUpdateRequest(BaseModel):
    user_id: str
    title: Optional[str] = None


def _normalize_language(language: str) -> str:
    value = (language or "english").strip().lower()
    if value in ["ar", "arabic"]:
        return "arabic"
    return "english"


def _initialize_cv_data(initial_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "personal_info": initial_data.get("personal_info", {
            "full_name": "",
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": "",
            "github": "",
            "title": ""
        }),
        "experience": initial_data.get("experience", []),
        "education": initial_data.get("education", []),
        "skills": initial_data.get("skills", []),
        "projects": initial_data.get("projects", []),
        "summary": initial_data.get("summary", ""),
        "certifications": initial_data.get("certifications", []),
        "languages": initial_data.get("languages", []),
        "_meta": initial_data.get("_meta", {})
    }


def _get_meta(cv_data: Dict[str, Any]) -> Dict[str, Any]:
    if "_meta" not in cv_data or not isinstance(cv_data["_meta"], dict):
        cv_data["_meta"] = {}
    return cv_data["_meta"]


def _detect_skip_flags(message: str) -> Dict[str, bool]:
    msg = (message or "").lower()
    return {
        "no_experience": bool(re.search(r"\b(no experience|no work experience|no jobs)\b", msg)),
        "no_certifications": bool(re.search(r"\b(no certifications|no certificates)\b", msg)),
        "no_projects": bool(re.search(r"\b(no projects)\b", msg)),
        "no_education": bool(re.search(r"\b(no education|no degree)\b", msg)),
    }


def _merge_cv_data(cv_data: Dict[str, Any], updates: Dict[str, Any]) -> None:
    if not updates:
        return

    personal_updates = updates.get("personal_info") or {}
    if personal_updates:
        personal_info = cv_data.get("personal_info", {})
        for key, value in personal_updates.items():
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            personal_info[key] = value
        cv_data["personal_info"] = personal_info

    for list_key in ["experience", "education", "skills", "projects", "certifications", "languages"]:
        incoming = updates.get(list_key)
        if not incoming:
            continue
        if list_key in ["skills", "certifications", "languages"]:
            existing = list(cv_data.get(list_key, []))
            for item in incoming:
                if not item:
                    continue
                cleaned = item.strip() if isinstance(item, str) else item
                if cleaned and cleaned not in existing:
                    existing.append(cleaned)
            cv_data[list_key] = existing
        else:
            existing = list(cv_data.get(list_key, []))
            for entry in incoming:
                if isinstance(entry, dict) and entry:
                    existing.append(entry)
            cv_data[list_key] = existing

    if updates.get("summary"):
        cv_data["summary"] = updates["summary"]


def _determine_current_step(cv_data: Dict[str, Any], skip_flags: Dict[str, bool]) -> str:
    personal = cv_data.get("personal_info", {})
    if not personal.get("full_name"):
        return "personal_info"
    if not personal.get("email"):
        return "personal_info_contact"

    if not skip_flags.get("no_experience") and len(cv_data.get("experience", [])) == 0:
        return "experience"
    if not skip_flags.get("no_education") and len(cv_data.get("education", [])) == 0:
        return "education"
    if len(cv_data.get("skills", [])) < 3:
        return "skills"
    if not cv_data.get("summary", "").strip():
        return "summary"
    return "review"


def _is_cv_complete(cv_data: Dict[str, Any], skip_flags: Dict[str, bool]) -> bool:
    personal = cv_data.get("personal_info", {})
    has_name = bool(personal.get("full_name"))
    has_email = bool(personal.get("email"))
    has_skills = len(cv_data.get("skills", [])) >= 3
    has_experience = len(cv_data.get("experience", [])) > 0 or skip_flags.get("no_experience")
    has_education = len(cv_data.get("education", [])) > 0 or skip_flags.get("no_education")
    return has_name and has_email and has_skills and (has_experience or has_education)


def _build_system_prompt(
    cv_data: Dict[str, Any],
    current_step: str,
    language: str,
    job_requirements: Optional[str],
    skip_flags: Dict[str, bool],
) -> str:
    cv_json_str = json.dumps(cv_data, ensure_ascii=False, indent=2)
    skip_json = json.dumps(skip_flags, ensure_ascii=False)
    requirements_text = job_requirements or ""

    return f"""You are 'Job Gate CV Assistant,' a friendly, highly professional CV coach.
Respond in {language}. Ask only ONE clear question at a time.
Be encouraging and focus on achievements with numbers.

Current CV data:
{cv_json_str}

Skip flags: {skip_json}
Current focus: {current_step}

Job requirements (if provided):
{requirements_text}

Instructions:
- Extract useful details from the user's message and acknowledge them.
- Ask the next best single question to complete the CV.
- If the user says they have no experience or certifications, do not ask for those sections again.
- If the CV is complete, confirm completion and offer export (PDF/DOCX) in English or Arabic.
"""


def _safe_json_loads(raw: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(raw)
    except Exception:
        return None


def _extract_cv_updates_with_llm(llm: LLMService, message: str, cv_data: Dict[str, Any]) -> Dict[str, Any]:
    if not llm.is_available():
        return {}

    prompt = f"""
Extract CV updates from the user's message.
Return ONLY JSON with this schema:
{{
  "updates": {{
    "personal_info": {{
      "full_name": "", "email": "", "phone": "", "location": "",
      "linkedin": "", "github": "", "title": ""
    }},
    "experience": [{{"position":"", "company":"", "duration":"", "description":"", "achievements":[]}}],
    "education": [{{"degree":"", "institution":"", "duration":"", "description":""}}],
    "skills": [],
    "projects": [],
    "certifications": [],
    "languages": [],
    "summary": ""
  }},
  "flags": {{
    "no_experience": false,
    "no_certifications": false,
    "no_projects": false,
    "no_education": false
  }},
  "intent": {{
    "complete": false,
    "request_export": false,
    "output_language": null
  }}
}}

User message:
{message}
"""

    try:
        response = llm.client.chat.completions.create(
            model=llm.model,
            messages=[
                {"role": "system", "content": "You extract CV data and return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        parsed = _safe_json_loads(response.choices[0].message.content)
        return parsed or {}
    except Exception as e:
        logger.warning(f"LLM extraction failed: {e}")
        return {}


def _fallback_extract(message: str) -> Dict[str, Any]:
    updates: Dict[str, Any] = {"personal_info": {}, "skills": []}
    if "@" in message and "." in message:
        emails = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", message)
        if emails:
            updates["personal_info"]["email"] = emails[0]
    phone_match = re.findall(r"[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]", message)
    if phone_match:
        updates["personal_info"]["phone"] = phone_match[0]
    if "," in message and len(message) < 200:
        skills = [s.strip().title() for s in message.split(",") if len(s.strip()) > 2]
        if skills:
            updates["skills"] = skills
    return {"updates": updates, "flags": {}, "intent": {}}


def _score_cv(cv_data: Dict[str, Any]) -> Dict[str, Any]:
    score = 100
    checklist = []

    personal = cv_data.get("personal_info", {})
    if not personal.get("linkedin") and not personal.get("github"):
        score -= 10
        checklist.append("Add LinkedIn or GitHub links.")

    experience = cv_data.get("experience", [])
    has_metrics = any(re.search(r"\d", str(item.get("description", ""))) for item in experience)
    if experience and not has_metrics:
        score -= 10
        checklist.append("Add measurable results (numbers, %).")

    skills = cv_data.get("skills", [])
    if len(skills) < 3:
        score -= 10
        checklist.append("Add at least 3 key skills.")

    if not cv_data.get("summary"):
        score -= 5
        checklist.append("Add a professional summary.")

    score = max(0, min(100, score))
    return {
        "score": score,
        "checklist": checklist
    }


def _generate_final_summary(llm: LLMService, cv_data: Dict[str, Any], job_requirements: Optional[str]) -> Dict[str, Any]:
    if not llm.is_available():
        return {
            "summary": "Your CV is ready. Consider adding more measurable achievements.",
            "improvements": ["Add metrics to your experience", "Include LinkedIn/GitHub links"],
            "job_requirements": job_requirements or "",
        }

    prompt = f"""
Create a final CV summary response in JSON with:
{{
  "summary": "",
  "improvements": ["", ""],
  "job_requirements": ""
}}

Base it on this CV data and job requirements. Keep it concise and practical.
CV Data:
{json.dumps(cv_data, ensure_ascii=False)}

Job requirements:
{job_requirements or ""}
"""
    try:
        response = llm.client.chat.completions.create(
            model=llm.model,
            messages=[
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        parsed = _safe_json_loads(response.choices[0].message.content)
        return parsed or {}
    except Exception as e:
        logger.warning(f"Final summary generation failed: {e}")
        return {}


def _translate_cv_payload(llm: LLMService, cv_data: Dict[str, Any], target_language: str) -> Dict[str, Any]:
    if not llm.is_available():
        return cv_data

    payload = {
        "summary": cv_data.get("summary", ""),
        "experience": cv_data.get("experience", []),
        "education": cv_data.get("education", []),
        "skills": cv_data.get("skills", []),
        "projects": cv_data.get("projects", []),
        "certifications": cv_data.get("certifications", []),
        "languages": cv_data.get("languages", []),
    }

    prompt = f"""
Translate all user-written text to {target_language}.
Keep names, emails, URLs, and numbers unchanged.
Return ONLY JSON with the same structure.
{json.dumps(payload, ensure_ascii=False)}
"""
    try:
        response = llm.client.chat.completions.create(
            model=llm.model,
            messages=[
                {"role": "system", "content": "You are a professional translator. Return only JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        parsed = _safe_json_loads(response.choices[0].message.content)
        if parsed:
            cv_data["summary"] = parsed.get("summary", cv_data.get("summary", ""))
            cv_data["experience"] = parsed.get("experience", cv_data.get("experience", []))
            cv_data["education"] = parsed.get("education", cv_data.get("education", []))
            cv_data["skills"] = parsed.get("skills", cv_data.get("skills", []))
            cv_data["projects"] = parsed.get("projects", cv_data.get("projects", []))
            cv_data["certifications"] = parsed.get("certifications", cv_data.get("certifications", []))
            cv_data["languages"] = parsed.get("languages", cv_data.get("languages", []))
    except Exception as e:
        logger.warning(f"Translation JSON failed: {e}")
    return cv_data


def _load_session(session_id: str) -> Optional[Dict[str, Any]]:
    record = db.get_chatbot_session(session_id)
    if not record:
        return None
    return {
        "session_id": record.session_id,
        "user_id": record.user_id,
        "language": record.language,
        "output_language": record.output_language,
        "current_step": record.current_step,
        "cv_data": record.cv_data or {},
        "conversation": record.conversation or [],
        "job_requirements": record.job_requirements,
        "job_posting_meta": record.job_posting_meta or {},
        "score_data": record.score_data or {},
        "final_summary": record.final_summary,
        "is_complete": bool(record.is_complete),
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


def _ensure_job_meta(session: Dict[str, Any]) -> Dict[str, Any]:
    meta = session.get("job_posting_meta")
    if not isinstance(meta, dict):
        meta = {}
    session["job_posting_meta"] = meta
    return meta


def _save_session(session: Dict[str, Any]) -> None:
    updates = {
        "language": session.get("language", "english"),
        "output_language": session.get("output_language", session.get("language", "english")),
        "current_step": session.get("current_step"),
        "cv_data": session.get("cv_data"),
        "conversation": session.get("conversation"),
        "job_requirements": session.get("job_requirements"),
        "job_posting_meta": session.get("job_posting_meta"),
        "score_data": session.get("score_data"),
        "final_summary": session.get("final_summary"),
        "is_complete": 1 if session.get("is_complete") else 0,
        "completed_at": datetime.utcnow() if session.get("is_complete") else None,
    }
    db.update_chatbot_session(session["session_id"], updates)


@router.post("/start")
async def start_chatbot(request: ChatbotStartRequest):
    language = _normalize_language(request.language)
    output_language = _normalize_language(request.output_language or request.language)
    session_id = f"chat_{request.user_id}_{uuid.uuid4().hex[:8]}"

    cv_data = _initialize_cv_data(request.initial_data)
    meta = _get_meta(cv_data)
    meta.setdefault("skip_flags", {})

    job_requirements = request.job_description or ""
    job_posting_meta = request.job_posting or {}

    current_step = _determine_current_step(cv_data, meta.get("skip_flags", {}))
    welcome_msg = (
        "مرحبا! أنا مساعد السيرة الذاتية. لنبدأ باسمك الكامل."
        if language == "arabic"
        else "Hello! I'm your CV assistant. Let's start with your full name."
    )

    session = {
        "session_id": session_id,
        "user_id": request.user_id,
        "language": language,
        "output_language": output_language,
        "current_step": current_step,
        "cv_data": cv_data,
        "conversation": [
            {"role": "assistant", "content": welcome_msg, "timestamp": datetime.now().isoformat()}
        ],
        "job_requirements": job_requirements,
        "job_posting_meta": job_posting_meta,
        "score_data": {},
        "final_summary": None,
        "is_complete": False,
    }

    db.create_chatbot_session(session)

    return {
        "success": True,
        "session_id": session_id,
        "message": welcome_msg,
        "current_step": current_step,
    }


@router.post("/chat")
async def chat_with_cv_bot(request: ChatbotMessageRequest):
    session = _load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    session["conversation"].append({
        "role": "user",
        "content": message,
        "timestamp": datetime.now().isoformat(),
    })

    llm_service = LLMService()
    cv_data = session.get("cv_data", {})
    meta = _get_meta(cv_data)
    skip_flags = meta.get("skip_flags", {})

    extracted = _extract_cv_updates_with_llm(llm_service, message, cv_data)
    if not extracted:
        extracted = _fallback_extract(message)

    updates = extracted.get("updates", {})
    flags = extracted.get("flags", {})
    intent = extracted.get("intent", {})

    for flag, value in _detect_skip_flags(message).items():
        if value:
            flags[flag] = True

    if flags:
        skip_flags.update(flags)
        meta["skip_flags"] = skip_flags

    _merge_cv_data(cv_data, updates)

    if request.job_description:
        session["job_requirements"] = request.job_description
    if request.job_posting:
        session["job_posting_meta"] = request.job_posting

    current_step = _determine_current_step(cv_data, skip_flags)
    session["current_step"] = current_step

    is_complete = _is_cv_complete(cv_data, skip_flags)
    if intent.get("complete"):
        is_complete = True
    session["is_complete"] = is_complete

    system_prompt = _build_system_prompt(
        cv_data,
        current_step,
        session.get("language", "english"),
        session.get("job_requirements"),
        skip_flags,
    )

    response_text = ""
    if llm_service.is_available():
        try:
            messages = [{"role": "system", "content": system_prompt}]
            for msg in session["conversation"][-12:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
            response_obj = llm_service.client.chat.completions.create(
                model=llm_service.model,
                messages=messages,
                temperature=0.6,
                max_tokens=600,
            )
            response_text = response_obj.choices[0].message.content.strip()
        except Exception as llm_error:
            logger.warning(f"LLM error: {llm_error}")
            response_text = (
                "Thanks! Tell me more about your experience."
                if session.get("language") == "english"
                else "شكرًا! أخبرني أكثر عن خبراتك."
            )
    else:
        response_text = (
            "Thanks! Tell me more about your experience."
            if session.get("language") == "english"
            else "شكرًا! أخبرني أكثر عن خبراتك."
        )

    session["conversation"].append({
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.now().isoformat(),
    })

    if session["is_complete"]:
        score_data = _score_cv(cv_data)
        final_summary = _generate_final_summary(llm_service, cv_data, session.get("job_requirements"))
        session["score_data"] = score_data
        session["final_summary"] = final_summary

    _save_session(session)

    return {
        "success": True,
        "session_id": session["session_id"],
        "message": response_text,
        "current_step": session["current_step"],
        "is_complete": session["is_complete"],
        "score": session.get("score_data", {}),
        "final_summary": session.get("final_summary"),
    }


@router.get("/session/{session_id}")
async def get_chatbot_session(session_id: str):
    session = _load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "success": True,
        "session": session,
    }


@router.patch("/session/{session_id}")
async def update_chatbot_session(session_id: str, request: ChatbotSessionUpdateRequest):
    session = _load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != request.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    meta = _ensure_job_meta(session)
    if request.title is not None:
        meta["session_title"] = request.title.strip()

    _save_session(session)
    return {
        "success": True,
        "session_id": session_id,
        "session_title": meta.get("session_title"),
    }


@router.delete("/session/{session_id}")
async def delete_chatbot_session(session_id: str, user_id: str = Query(..., min_length=1)):
    session = _load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    ok = db.delete_chatbot_session(session_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete session")
    return {"success": True, "session_id": session_id}


@router.get("/sessions")
async def list_chatbot_sessions(user_id: str = Query(..., min_length=1)):
    records = db.list_chatbot_sessions(user_id, limit=50)
    return {
        "success": True,
        "sessions": [record.to_dict() for record in records],
    }


@router.get("/insights/{session_id}")
async def get_chatbot_insights(session_id: str, user_id: str = Query(..., min_length=1)):
    session = _load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "success": True,
        "session_id": session_id,
        "is_complete": session.get("is_complete"),
        "current_step": session.get("current_step"),
        "score": session.get("score_data", {}),
        "final_summary": session.get("final_summary"),
        "session_title": (session.get("job_posting_meta") or {}).get("session_title"),
    }


@router.post("/export")
async def export_cv_document(request: ChatbotExportRequest):
    session = _load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    language = _normalize_language(request.language or session.get("output_language") or session.get("language"))
    llm_service = LLMService()
    cv_data = json.loads(json.dumps(session.get("cv_data", {})))

    if language != _normalize_language(session.get("language")):
        cv_data = _translate_cv_payload(llm_service, cv_data, language)

    cv_data["summary_professional"] = cv_data.get("summary", "")

    fmt = (request.format or "pdf").lower()
    if fmt == "pdf":
        path = await document_generator.generate_pdf(cv_data, language)
        return FileResponse(path, media_type="application/pdf", filename=os.path.basename(path))
    if fmt == "docx":
        path = await document_generator.generate_docx(cv_data, language)
        return FileResponse(
            path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=os.path.basename(path),
        )

    paths = await document_generator.generate_both(cv_data, language)
    return {"success": True, "paths": paths}


@router.get("/preview/{session_id}")
async def preview_cv_document(session_id: str, language: Optional[str] = None):
    session = _load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    resolved_language = _normalize_language(language or session.get("output_language") or session.get("language"))
    llm_service = LLMService()
    cv_data = json.loads(json.dumps(session.get("cv_data", {})))

    if resolved_language != _normalize_language(session.get("language")):
        cv_data = _translate_cv_payload(llm_service, cv_data, resolved_language)

    cv_data["summary_professional"] = cv_data.get("summary", "")
    html = document_generator.generate_html(cv_data, resolved_language)
    return HTMLResponse(content=html)
