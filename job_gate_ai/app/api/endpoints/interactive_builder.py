
from fastapi import APIRouter ,HTTPException 
from typing import Dict ,Any ,List 
import uuid 
from datetime import datetime 

from app .models .schemas import (
StartSessionRequest ,
ChatRequest ,
GenerateSectionRequest ,
ChatSessionResponse 
)

router =APIRouter (prefix ="/builder",tags =["Interactive Builder"])


sessions ={}

@router .post ("/start",response_model =ChatSessionResponse )
async def start_builder_session (request :StartSessionRequest ):


    session_id =f"{request .user_id }_{uuid .uuid4 ().hex [:8 ]}"


    session ={
    "session_id":session_id ,
    "user_id":request .user_id ,
    "language":request .language ,
    "current_cv":request .initial_cv or {
    "personal_info":{},
    "summary":"",
    "experience":[],
    "education":[],
    "skills":[],
    "projects":[],
    "certifications":[]
    },
    "conversation":[],
    "created_at":datetime .now ().isoformat (),
    "last_activity":datetime .now ().isoformat (),
    "current_step":"welcome"
    }


    welcome_message =(
    "Hello! I'm your CV assistant. I'll help you create a professional CV. "
    "Let's start with some basic information.\n\n"
    "What's your full name?"
    )


    sessions [session_id ]=session 

    return ChatSessionResponse (
    success =True ,
    session_id =session_id ,
    message =welcome_message ,
    suggestions =["Provide your full name","Skip to next section"],
    next_step ="personal_info"
    )

@router .post ("/chat",response_model =ChatSessionResponse )
async def chat_with_builder (request :ChatRequest ):


    session =None 
    session_id =None 


    for sid ,sess in sessions .items ():
        if sess ["user_id"]==request .user_id :
            session =sess 
            session_id =sid 
            break 

    if not session :

        session_id =f"{request .user_id }_{uuid .uuid4 ().hex [:8 ]}"
        session ={
        "session_id":session_id ,
        "user_id":request .user_id ,
        "language":"english",
        "current_cv":{
        "personal_info":{},
        "summary":"",
        "experience":[],
        "education":[],
        "skills":[],
        "projects":[],
        "certifications":[]
        },
        "conversation":[],
        "created_at":datetime .now ().isoformat (),
        "last_activity":datetime .now ().isoformat (),
        "current_step":"welcome"
        }
        sessions [session_id ]=session 


    session ["conversation"].append ({
    "role":"user",
    "content":request .message ,
    "timestamp":datetime .now ().isoformat ()
    })


    current_step =session ["current_step"]
    response_message =""
    next_step =current_step 

    if current_step =="welcome"or "name"in request .message .lower ():

        name =request .message 
        session ["current_cv"]["personal_info"]["full_name"]=name 
        response_message =f"Great, {name }! What's your email address?"
        next_step ="email"

    elif current_step =="email"or "@"in request .message :
        session ["current_cv"]["personal_info"]["email"]=request .message 
        response_message ="Perfect! What's your phone number?"
        next_step ="phone"

    elif current_step =="phone"or any (char .isdigit ()for char in request .message ):
        session ["current_cv"]["personal_info"]["phone"]=request .message 
        response_message ="Thanks! Now let's talk about your work experience. What's your current or most recent job title?"
        next_step ="job_title"

    elif current_step =="job_title":
        session ["current_cv"]["experience"].append ({
        "position":request .message ,
        "company":"",
        "duration":"",
        "description":""
        })
        response_message =f"What company do/did you work at as a {request .message }?"
        next_step ="company"

    elif current_step =="company":
        if session ["current_cv"]["experience"]:
            session ["current_cv"]["experience"][-1 ]["company"]=request .message 
        response_message ="How long did you work there? (e.g., Jan 2020 - Present)"
        next_step ="duration"

    elif current_step =="duration":
        if session ["current_cv"]["experience"]:
            session ["current_cv"]["experience"][-1 ]["duration"]=request .message 
        response_message ="Describe your main responsibilities and achievements in this role:"
        next_step ="description"

    else :

        response_message =(
        "I'll help you build a great CV! Let me know what you'd like to add:\n"
        "1. Personal information\n"
        "2. Work experience\n"
        "3. Education\n"
        "4. Skills\n"
        "5. Projects"
        )


    session ["current_step"]=next_step 
    session ["last_activity"]=datetime .now ().isoformat ()
    session ["conversation"].append ({
    "role":"assistant",
    "content":response_message ,
    "timestamp":datetime .now ().isoformat ()
    })

    return ChatSessionResponse (
    success =True ,
    session_id =session_id ,
    message =response_message ,
    suggestions =["Continue with next question","Review current CV","Skip to skills"],
    next_step =next_step 
    )

@router .post ("/generate-section")
async def generate_cv_section (request :GenerateSectionRequest ):

    templates ={
    "summary":"""
        Results-driven professional with {years} years of experience in {field}. 
        Proven track record in {achievement1} and {achievement2}. 
        Seeking to leverage expertise in {skill1} and {skill2} to contribute to {goal}.
        """,

    "experience":"""
        {position}
        {company} | {duration}
        
        Key Achievements:
        • {achievement1}
        • {achievement2}
        • {achievement3}
        
        Technologies: {technologies}
        """,

    "skills":"""
        Technical Skills:
        • {technical_skills}
        
        Soft Skills:
        • {soft_skills}
        
        Tools & Platforms:
        • {tools}
        """
    }

    template =templates .get (request .section ,"{content}")


    generated_content =template 
    for key ,value in request .user_inputs .items ():
        if isinstance (value ,list ):
            value =", ".join (value )
        generated_content =generated_content .replace (f"{{{key }}}",str (value ))

    return {
    "success":True ,
    "section":request .section ,
    "generated_content":generated_content ,
    "improved_version":generated_content ,
    "suggestions":[
    "Add quantifiable achievements with numbers",
    "Use strong action verbs",
    "Focus on results and impact"
    ]
    }

@router .get ("/session/{user_id}")
async def get_session_status (user_id :str ):

    session =None 
    for sid ,sess in sessions .items ():
        if sess ["user_id"]==user_id :
            session =sess 
            break 

    if not session :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    return {
    "success":True ,
    "session_id":session ["session_id"],
    "user_id":user_id ,
    "current_step":session ["current_step"],
    "cv_progress":calculate_progress (session ["current_cv"]),
    "conversation_length":len (session ["conversation"]),
    "last_activity":session ["last_activity"]
    }

def calculate_progress (cv_data :Dict [str ,Any ])->Dict [str ,Any ]:
    total_sections =5 
    completed =0 

    if cv_data ["personal_info"]:
        completed +=1 
    if cv_data ["experience"]:
        completed +=1 
    if cv_data ["education"]:
        completed +=1 
    if cv_data ["skills"]:
        completed +=1 

    percentage =(completed /total_sections )*100 

    return {
    "percentage":percentage ,
    "completed":completed ,
    "total":total_sections ,
    "status":"Beginner"if percentage <30 else "Intermediate"if percentage <70 else "Advanced"
    }