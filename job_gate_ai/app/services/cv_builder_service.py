
from typing import Dict ,List ,Optional ,Any 
from enum import Enum 
import json 
from datetime import datetime 

class CVSection (Enum ):
    PERSONAL_INFO ="personal_info"
    SUMMARY ="summary"
    EXPERIENCE ="experience"
    EDUCATION ="education"
    SKILLS ="skills"
    PROJECTS ="projects"
    CERTIFICATIONS ="certifications"
    LANGUAGES ="languages"

class BuilderState (Enum ):
    START ="start"
    COLLECTING_PERSONAL ="collecting_personal"
    COLLECTING_EXPERIENCE ="collecting_experience"
    COLLECTING_EDUCATION ="collecting_education"
    COLLECTING_SKILLS ="collecting_skills"
    REVIEWING ="reviewing"
    COMPLETE ="complete"

class CVBuilderService :
    def __init__ (self ):
        self .conversation_flows ={
        BuilderState .START :self ._start_conversation ,
        BuilderState .COLLECTING_PERSONAL :self ._collect_personal_info ,
        BuilderState .COLLECTING_EXPERIENCE :self ._collect_experience ,
        BuilderState .COLLECTING_EDUCATION :self ._collect_education ,
        BuilderState .COLLECTING_SKILLS :self ._collect_skills ,
        BuilderState .REVIEWING :self ._review_cv 
        }

    def create_session (self ,user_id :str ,language :str ="arabic")->Dict [str ,Any ]:
        return {
        "session_id":f"{user_id }_{datetime .now ().timestamp ()}",
        "user_id":user_id ,
        "language":language ,
        "state":BuilderState .START .value ,
        "current_cv":{
        "personal_info":{},
        "experience":[],
        "education":[],
        "skills":[],
        "projects":[],
        "certifications":[],
        "languages":[]
        },
        "conversation_history":[],
        "created_at":datetime .now ().isoformat (),
        "last_updated":datetime .now ().isoformat (),
        "is_complete":False 
        }

    async def process_message (self ,session :Dict ,user_message :str )->Dict [str ,Any ]:


        session ["conversation_history"].append ({
        "role":"user",
        "content":user_message ,
        "timestamp":datetime .now ().isoformat ()
        })


        current_state =BuilderState (session ["state"])


        if current_state in self .conversation_flows :
            response =await self .conversation_flows [current_state ](session ,user_message )
        else :
            response =await self ._default_response (session ,user_message )


        session ["conversation_history"].append ({
        "role":"assistant",
        "content":response ["message"],
        "timestamp":datetime .now ().isoformat ()
        })


        session ["state"]=response .get ("next_state",session ["state"])
        session ["last_updated"]=datetime .now ().isoformat ()


        if response .get ("is_complete",False ):
            session ["is_complete"]=True 
            session ["state"]=BuilderState .COMPLETE .value 

        return {
        "session":session ,
        "response":response ["message"],
        "next_state":session ["state"],
        "suggested_next_questions":response .get ("suggested_questions",[]),
        "is_complete":session ["is_complete"]
        }

    async def _start_conversation (self ,session :Dict ,user_message :str )->Dict [str ,Any ]:
        from app .services .deepseek_service import DeepSeekService 
        deepseek =DeepSeekService ()

        welcome_message =await deepseek .generate_arabic_content (
        context ={"language":session ["language"]},
        section ="welcome",
        language =session ["language"]
        )

        return {
        "message":welcome_message ,
        "next_state":BuilderState .COLLECTING_PERSONAL .value ,
        "suggested_questions":[
        "ما هو اسمك الكامل؟",
        "ما هو بريدك الإلكتروني؟",
        "ما هو رقم هاتفك؟"
        ]
        }

    async def _collect_personal_info (self ,session :Dict ,user_message :str )->Dict [str ,Any ]:
        from app .services .deepseek_service import DeepSeekService 
        deepseek =DeepSeekService ()





        response =await deepseek .generate_arabic_content (
        context ={
        "user_message":user_message ,
        "current_section":"personal_info",
        "language":session ["language"]
        },
        section ="personal_info_collection",
        language =session ["language"]
        )


        personal_info_collected =len (session ["current_cv"]["personal_info"])>2 

        next_state =BuilderState .COLLECTING_EXPERIENCE .value if personal_info_collected else BuilderState .COLLECTING_PERSONAL .value 

        suggested_questions =[]
        if not personal_info_collected :
            if "name"not in session ["current_cv"]["personal_info"]:
                suggested_questions .append ("ما هو اسمك الكامل؟")
            if "email"not in session ["current_cv"]["personal_info"]:
                suggested_questions .append ("ما هو بريدك الإلكتروني؟")
            if "phone"not in session ["current_cv"]["personal_info"]:
                suggested_questions .append ("ما هو رقم هاتفك؟")
        else :
            suggested_questions =["لنبدأ بالخبرة العملية. ما هو آخر منصب شغلته؟"]

        return {
        "message":response ,
        "next_state":next_state ,
        "suggested_questions":suggested_questions 
        }



    async def generate_final_cv (self ,session :Dict )->Dict [str ,Any ]:
        from app .services .deepseek_service import DeepSeekService 
        deepseek =DeepSeekService ()


        cv_data =session ["current_cv"]


        for section ,data in cv_data .items ():
            if data :
                generated_content =await deepseek .generate_arabic_content (
                context ={"raw_data":data ,"section":section },
                section =section ,
                language =session ["language"]
                )
                cv_data [f"{section }_professional"]=generated_content 

        return {
        "success":True ,
        "cv_data":cv_data ,
        "professional_cv":cv_data ,
        "session_id":session ["session_id"],
        "generated_at":datetime .now ().isoformat ()
        }