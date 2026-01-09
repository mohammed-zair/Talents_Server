from fastapi import APIRouter ,HTTPException 
from typing import Dict ,Any ,List 
import uuid 
import json
import logging
import os
from datetime import datetime 
from pydantic import BaseModel 
from pydantic import ConfigDict
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)
router =APIRouter (prefix ="/chatbot",tags =["Chatbot"])

class ChatbotStartRequest (BaseModel ):
    model_config = ConfigDict(coerce_numbers_to_str=True)
    user_id :str 
    language :str ="english"
    initial_data :Dict [str ,Any ]={}

class ChatbotMessageRequest (BaseModel ):
    session_id :str 
    message :str 

chatbot_sessions ={}

_SESSIONS_FILE = os.getenv(
    "CHATBOT_SESSIONS_FILE",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chatbot_sessions.json"),
)


def _load_sessions() -> None:
    global chatbot_sessions
    try:
        if os.path.exists(_SESSIONS_FILE):
            with open(_SESSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    chatbot_sessions = data
    except Exception as e:
        logger.warning(f"Failed to load chatbot sessions: {e}")


def _save_sessions() -> None:
    try:
        base_dir = os.path.dirname(_SESSIONS_FILE)
        if base_dir:
            os.makedirs(base_dir, exist_ok=True)
        with open(_SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(chatbot_sessions, f, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"Failed to save chatbot sessions: {e}")


_load_sessions()


# Initialize LLM service globally
_llm_service = None


def get_llm_service():
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


def _initialize_cv_data(initial_data: Dict[str, Any]) -> Dict[str, Any]:
    """Initialize structured CV data with defaults"""
    return {
        "personal_info": initial_data.get("personal_info", {
            "full_name": "",
            "email": "",
            "phone": "",
            "location": ""
        }),
        "experience": initial_data.get("experience", []),
        "education": initial_data.get("education", []),
        "skills": initial_data.get("skills", []),
        "projects": initial_data.get("projects", []),
        "summary": initial_data.get("summary", ""),
        "certifications": initial_data.get("certifications", []),
        "languages": initial_data.get("languages", [])
    }


def _determine_current_step(cv_data: Dict[str, Any]) -> str:
    """Determine which section of CV needs attention next"""
    if not cv_data.get("personal_info", {}).get("full_name"):
        return "personal_info"
    if not cv_data.get("personal_info", {}).get("email"):
        return "personal_info_contact"
    if len(cv_data.get("experience", [])) == 0:
        return "experience"
    if len(cv_data.get("education", [])) == 0:
        return "education"
    if len(cv_data.get("skills", [])) < 3:
        return "skills"
    if not cv_data.get("summary", "").strip():
        return "summary"
    return "review"


def _build_system_prompt(cv_data: Dict[str, Any], current_step: str, language: str) -> str:
    """Build dynamic system prompt with current CV data"""
    cv_json_str = json.dumps(cv_data, ensure_ascii=False, indent=2)
    
    system_prompt = f"""You are 'Job Gate CV Assistant,' an expert, friendly, and highly professional CV (Curriculum Vitae) creator and optimization coach. Your primary language is Arabic, but you must respond in the user's requested language ({language}). Your goal is to guide the user through building a professional, ATS-compatible CV and improving their content.

**Tone:** Highly supportive, encouraging, professional, and friendly. Never judgmental.
**Goal:** Maximize employment chances by creating a results-oriented, high-scoring CV.
**Key Principle:** Always prioritize quantifiable achievements (numbers, percentages, metrics) over basic duties.

**Current CV Data:**
```json
{cv_json_str}
```

**Current Focus Section:** {current_step}

**Core Functions:**
1. **CV Creation (Data Collection):** Extract specific data from user's message, update the CV data field, and ask the next logical question.
2. **Content Improvement:** Rewrite user's input into professional, performance-oriented bullet points using strong action verbs and quantifiable metrics.
3. **Summary Generation:** Generate a 3-4 line professional career summary based on ALL existing data (Experience, Skills, Education).
4. **Finalization:** When required data is complete (Name, 1 Experience, 1 Education, 3 Skills), confirm completion.
5. **General Advice:** Answer general CV/ATS questions clearly and suggest how to continue building.

**Response Guidelines:**
- Keep responses concise (1-3 sentences for questions, up to 5 for advice/rewrites).
- Always reference user's existing data when providing context.
- For content improvement, provide the exact rewritten text the user should use.
- Guide the user step-by-step through CV sections.
- Be encouraging and highlight their strengths.

**Always ensure your response directly addresses the user's message and moves the CV building forward.**"""
    
    return system_prompt


@router .post ("/start")
async def start_chatbot (request :ChatbotStartRequest ):
    session_id =f"chat_{request .user_id }_{uuid .uuid4 ().hex [:8 ]}"
    
    cv_data = _initialize_cv_data(request.initial_data)
    current_step = _determine_current_step(cv_data)

    welcome_msg = f"Hello! I'm Job Gate CV Assistant. Let's build your professional CV together. {chr(10)}{chr(10)}What is your **full name**?"
    
    session ={
    "session_id":session_id ,
    "user_id":request .user_id ,
    "language":request .language ,
    "conversation":[
    {
    "role":"assistant",
    "content": welcome_msg,
    "timestamp":datetime .now ().isoformat ()
    }
    ],
    "cv_data": cv_data,
    "current_step": current_step,
    "created_at":datetime .now ().isoformat (),
    "last_activity":datetime .now ().isoformat ()
    }

    chatbot_sessions [session_id ]=session 

    _save_sessions()

    return {
    "success":True ,
    "session_id":session_id ,
    "message": welcome_msg,
    "session":{
    "session_id":session_id ,
    "user_id":request .user_id ,
    "conversation_length":1,
    "current_step": current_step
    }
    }


@router .post ("/chat")
async def chat_with_cv_bot (request :ChatbotMessageRequest ):
    if request .session_id not in chatbot_sessions :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    session =chatbot_sessions [request .session_id ]
    
    session["conversation"].append({
    "role":"user",
    "content":request .message,
    "timestamp":datetime .now ().isoformat ()
    })
    session["last_activity"] = datetime.now().isoformat()
    _save_sessions()

    try:
        llm_service = get_llm_service()
        system_prompt = _build_system_prompt(
            session["cv_data"],
            session.get("current_step", "review"),
            session.get("language", "english")
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        for msg in session["conversation"][-20:]:
            if msg.get("role") in ["user", "assistant"]:
                messages.append({
                    "role": msg["role"],
                    "content": msg.get("content", "")
                })

        if llm_service.is_available():
            try:
                response_obj = llm_service.client.chat.completions.create(
                    model=llm_service.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500
                )
                response = response_obj.choices[0].message.content.strip()
            except Exception as llm_error:
                logger.warning(f"LLM error: {llm_error}, using fallback")
                response = _generate_fallback_response(request.message, session["cv_data"])
        else:
            response = _generate_fallback_response(request.message, session["cv_data"])

        session["conversation"].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })

        _try_extract_cv_data(request.message, session["cv_data"], session.get("current_step", "review"))
        session["current_step"] = _determine_current_step(session["cv_data"])
        session["last_activity"] = datetime.now().isoformat()
        _save_sessions()

        return {
            "success": True,
            "session_id": request.session_id,
            "message": response,
            "conversation_length": len(session["conversation"]),
            "current_step": session["current_step"],
            "cv_data_summary": {
                "has_name": bool(session["cv_data"].get("personal_info", {}).get("full_name")),
                "has_email": bool(session["cv_data"].get("personal_info", {}).get("email")),
                "experience_count": len(session["cv_data"].get("experience", [])),
                "skills_count": len(session["cv_data"].get("skills", [])),
                "education_count": len(session["cv_data"].get("education", []))
            }
        }

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


def _generate_fallback_response(user_message: str, cv_data: Dict[str, Any]) -> str:
    """Generate response without LLM"""
    msg_lower = user_message.lower()
    
    # Simple keyword-based responses
    if any(word in msg_lower for word in ["hello", "hi", "hey", "start"]):
        if not cv_data.get("personal_info", {}).get("full_name"):
            return "Great! Let's begin. What is your full name?"
        else:
            return f"Hi {cv_data['personal_info']['full_name']}! What would you like to work on next?"
    
    elif any(word in msg_lower for word in ["improve", "better", "fix", "rewrite"]):
        return "I'd be happy to help improve that section. Please tell me the exact text you'd like me to rewrite."
    
    elif any(word in msg_lower for word in ["experience", "work", "job", "position"]):
        return "Tell me about your most recent job: What was your position, company, and dates?"
    
    elif any(word in msg_lower for word in ["skill", "technical", "tools", "language"]):
        return "List 3-5 key skills or technologies you're proficient in, separated by commas."
    
    elif any(word in msg_lower for word in ["education", "degree", "university", "college"]):
        return "What is your highest education level and where did you study?"
    
    elif any(word in msg_lower for word in ["summary", "profile", "objective"]):
        return "I'll generate a professional summary based on your experience and skills."
    
    elif any(word in msg_lower for word in ["finish", "done", "complete", "export", "pdf", "download"]):
        return "Excellent! Your CV is ready. Click 'Generate PDF' or 'Generate DOCX' to download your document."
    
    else:
        return "I can help you with: building your CV, improving sections, or answering ATS questions. What would you like to do?"

def _try_extract_cv_data(user_message: str, cv_data: Dict[str, Any], current_step: str) -> None:
    """Attempt simple extraction of CV data from user message"""
    msg_lower = user_message.lower()
    
    # Try to extract email
    if "@" in user_message and "." in user_message:
        import re
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', user_message)
        if emails and not cv_data.get("personal_info", {}).get("email"):
            cv_data["personal_info"]["email"] = emails[0]
    
    # Try to extract name (simple heuristic: if current_step is personal_info and message has 2+ words)
    if current_step == "personal_info" and not cv_data.get("personal_info", {}).get("full_name"):
        words = [w for w in user_message.split() if len(w) > 2 and w[0].isupper()]
        if len(words) >= 1:
            cv_data["personal_info"]["full_name"] = " ".join(words[:3])
    
    # Try to extract skills (simple: if skills mentioned, split by comma)
    if "skill" in msg_lower or "technical" in msg_lower:
        # Extract comma-separated items
        import re
        potential_skills = re.split(r'[,;]', user_message)
        for skill in potential_skills:
            skill_clean = skill.strip().title()
            if len(skill_clean) > 2 and skill_clean not in cv_data.get("skills", []):
                cv_data["skills"].append(skill_clean)

@router .get ("/session/{session_id}")
async def get_chatbot_session (session_id :str ):
    if session_id not in chatbot_sessions :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    session =chatbot_sessions [session_id ]

    return {
    "success":True ,
    "session_id":session_id ,
    "user_id":session ["user_id"],
    "conversation_length":len (session ["conversation"]),
    "last_activity":session ["last_activity"],
    "created_at":session ["created_at"]
    }