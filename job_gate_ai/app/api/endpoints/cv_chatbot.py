
from fastapi import APIRouter ,HTTPException ,BackgroundTasks 
from typing import Dict ,Any ,List 
from pydantic import BaseModel 
import uuid 
from datetime import datetime 

from app .services .cv_builder_service import CVBuilderService ,BuilderState 
from app .services .document_generator import DocumentGenerator 

router =APIRouter (prefix ="/chatbot",tags =["CV Creation Chatbot"])


sessions ={}

class StartChatRequest (BaseModel ):
    user_id :str 
    language :str ="arabic"
    initial_data :Dict [str ,Any ]={}

class ChatMessage (BaseModel ):
    session_id :str 
    message :str 

class GenerateDocumentRequest (BaseModel ):
    session_id :str 
    format :str ="pdf"
    language :str ="arabic"

@router .post ("/start")
async def start_cv_chatbot (request :StartChatRequest ):
    builder =CVBuilderService ()

    session =builder .create_session (
    user_id =request .user_id ,
    language =request .language 
    )


    if request .initial_data :
        session ["current_cv"].update (request .initial_data )


    sessions [session ["session_id"]]=session 


    result =await builder .process_message (session ,"بداية")

    return {
    "success":True ,
    "session_id":session ["session_id"],
    "welcome_message":result ["response"],
    "next_questions":result ["suggested_next_questions"],
    "current_state":result ["next_state"],
    "session":session 
    }

@router .post ("/chat")
async def chat_with_cv_bot (request :ChatMessage ):
    if request .session_id not in sessions :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    session =sessions [request .session_id ]

    if session ["is_complete"]:
        raise HTTPException (status_code =400 ,detail ="CV creation already complete")

    builder =CVBuilderService ()

    try :
        result =await builder .process_message (session ,request .message )


        sessions [request .session_id ]=result ["session"]

        response_data ={
        "success":True ,
        "response":result ["response"],
        "next_questions":result ["suggested_next_questions"],
        "current_state":result ["next_state"],
        "is_complete":result ["is_complete"],
        "cv_progress":self ._calculate_cv_progress (result ["session"])
        }


        if result ["is_complete"]:
            final_cv =await builder .generate_final_cv (result ["session"])
            response_data ["final_cv"]=final_cv 

        return response_data 

    except Exception as e :
        raise HTTPException (status_code =500 ,detail =f"Chat error: {str (e )}")

@router .post ("/generate-document")
async def generate_cv_document (request :GenerateDocumentRequest ,background_tasks :BackgroundTasks ):
    if request .session_id not in sessions :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    session =sessions [request .session_id ]

    if not session ["is_complete"]:
        raise HTTPException (status_code =400 ,detail ="CV creation not complete yet")

    builder =CVBuilderService ()
    document_generator =DocumentGenerator ()


    final_cv =await builder .generate_final_cv (session )


    if request .format =="pdf":
        document_path =await document_generator .generate_pdf (final_cv ["professional_cv"],request .language)
    elif request .format =="docx":
        document_path =await document_generator .generate_docx (final_cv ["professional_cv"],request .language)
    else :
        document_path =await document_generator .generate_both (final_cv ["professional_cv"],request .language)

    return {
    "success":True ,
    "document_url":f"/download/{document_path }",
    "cv_data":final_cv ["cv_data"],
    "session_id":request .session_id ,
    "format":request .format ,
    "language":request .language 
    }

@router .get ("/session/{session_id}")
async def get_session_status (session_id :str ):
    if session_id not in sessions :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    session =sessions [session_id ]

    return {
    "success":True ,
    "session_id":session_id ,
    "state":session ["state"],
    "is_complete":session ["is_complete"],
    "progress":self ._calculate_cv_progress (session ),
    "last_updated":session ["last_updated"],
    "conversation_length":len (session ["conversation_history"])
    }

@router .get ("/session/{session_id}/cv-preview")
async def get_cv_preview (session_id :str ):
    if session_id not in sessions :
        raise HTTPException (status_code =404 ,detail ="Session not found")

    session =sessions [session_id ]

    return {
    "success":True ,
    "session_id":session_id ,
    "cv_data":session ["current_cv"],
    "is_complete":session ["is_complete"]
    }

def _calculate_cv_progress (session :Dict )->Dict [str ,Any ]:
    cv_data =session ["current_cv"]
    total_sections =7 
    completed_sections =0 


    if cv_data ["personal_info"]:
        completed_sections +=1 
    if cv_data ["experience"]:
        completed_sections +=1 
    if cv_data ["education"]:
        completed_sections +=1 
    if cv_data ["skills"]:
        completed_sections +=1 
    if cv_data ["projects"]:
        completed_sections +=1 
    if cv_data ["certifications"]:
        completed_sections +=1 
    if cv_data ["languages"]:
        completed_sections +=1 

    progress_percentage =(completed_sections /total_sections )*100 

    return {
    "percentage":progress_percentage ,
    "completed_sections":completed_sections ,
    "total_sections":total_sections ,
    "missing_sections":self ._get_missing_sections (cv_data )
    }
