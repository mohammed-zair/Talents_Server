
from sqlalchemy import Column ,Integer ,String ,JSON ,DateTime ,Float ,ForeignKey ,UniqueConstraint ,Text 
from sqlalchemy .ext .declarative import declarative_base 
from sqlalchemy .orm import relationship 
from datetime import datetime 
from pydantic import BaseModel ,Field 
from typing import List ,Optional ,Dict ,Any 
from enum import Enum 

Base =declarative_base ()

class User (Base ):
    __tablename__ ="users"

    id =Column (Integer ,primary_key =True ,index =True )
    user_id =Column (String (255 ),unique =True ,index =True ,nullable =False )
    email =Column (String (255 ),unique =True ,index =True )
    created_at =Column (DateTime ,default =datetime .utcnow )
    updated_at =Column (DateTime ,default =datetime .utcnow ,onupdate =datetime .utcnow )


    cv_analyses =relationship ("CVAnalysis",back_populates ="user",cascade ="all, delete-orphan")
    builder_sessions =relationship ("BuilderSession",back_populates ="user",cascade ="all, delete-orphan")

class CVAnalysis (Base ):
    __tablename__ ="cv_analyses"

    id =Column (Integer ,primary_key =True ,index =True )
    user_id =Column (Integer ,ForeignKey ('users.id',ondelete ="CASCADE"),index =True )
    file_name =Column (String (255 ),nullable =False )
    file_hash =Column (String (255 ),index =True )


    structured_data =Column (JSON ,nullable =False )
    ats_score =Column (Float ,default =0.0 )


    features =Column (JSON ,nullable =False ,default =dict )


    analysis_method =Column (String (100 ),default ="fallback")
    processing_time =Column (Float ,default =0.0 )
    created_at =Column (DateTime ,default =datetime .utcnow )


    file_path =Column (String (512 ))


    user =relationship ("User",back_populates ="cv_analyses")

    __table_args__ =(
    UniqueConstraint ('user_id','file_hash',name ='uix_user_file'),
    )

    def to_dict (self ):
        return {
        "id":self .id ,
        "user_id":self .user .user_id if self .user else None ,
        "file_name":self .file_name ,
        "ats_score":self .ats_score ,
        "analysis_method":self .analysis_method ,
        "created_at":self .created_at .isoformat (),
        "features":self .features ,
        "processing_time":self .processing_time ,
        "has_file":bool (self .file_path ),
        "structured_data_keys":list (self .structured_data .keys ())if self .structured_data else []
        }

class BuilderSession (Base ):
    __tablename__ ="builder_sessions"

    id =Column (Integer ,primary_key =True ,index =True )
    session_id =Column (String (255 ),unique =True ,index =True ,nullable =False )
    user_id =Column (Integer ,ForeignKey ('users.id',ondelete ="CASCADE"),index =True )


    current_cv =Column (JSON ,nullable =False ,default =dict )
    conversation_history =Column (JSON ,nullable =False ,default =list )


    current_state =Column (String (100 ),default ="start")
    is_active =Column (Integer ,default =1 )
    is_complete =Column (Integer ,default =0 )


    created_at =Column (DateTime ,default =datetime .utcnow )
    last_activity =Column (DateTime ,default =datetime .utcnow ,onupdate =datetime .utcnow )
    completed_at =Column (DateTime ,nullable =True )


    user =relationship ("User",back_populates ="builder_sessions")

    def to_dict (self ):
        return {
        "session_id":self .session_id ,
        "user_id":self .user .user_id if self .user else None ,
        "current_state":self .current_state ,
        "is_active":bool (self .is_active ),
        "is_complete":bool (self .is_complete ),
        "progress":self ._calculate_progress (),
        "created_at":self .created_at .isoformat (),
        "last_activity":self .last_activity .isoformat (),
        "conversation_length":len (self .conversation_history )
        }

    def _calculate_progress (self ):
        if not self .current_cv :
            return 0 

        sections =['personal_info','experience','education','skills','projects','certifications']
        completed =0 
        for section in sections :
            section_data =self .current_cv .get (section )
            if section_data :
                if isinstance (section_data ,dict ):
                    if section_data :
                        completed +=1 
                elif isinstance (section_data ,list ):
                    if len (section_data )>0 :
                        completed +=1 
                elif section_data :
                    completed +=1 

        return round ((completed /len (sections ))*100 ,2 )


class ChatbotSession (Base ):
    __tablename__ ="ai_cv_chat_sessions"

    id =Column (Integer ,primary_key =True ,index =True )
    session_id =Column (String (255 ),unique =True ,index =True ,nullable =False )
    user_id =Column (String (255 ),index =True ,nullable =False )

    language =Column (String (50 ),default ="english")
    output_language =Column (String (50 ),default ="english")
    current_step =Column (String (100 ),default ="personal_info")

    cv_data =Column (JSON ,nullable =False ,default =dict )
    conversation =Column (JSON ,nullable =False ,default =list )

    job_requirements =Column (Text ,nullable =True )
    job_posting_meta =Column (JSON ,nullable =True ,default =dict )
    score_data =Column (JSON ,nullable =True ,default =dict )
    final_summary =Column (Text ,nullable =True )

    is_complete =Column (Integer ,default =0 )
    created_at =Column (DateTime ,default =datetime .utcnow )
    updated_at =Column (DateTime ,default =datetime .utcnow ,onupdate =datetime .utcnow )
    completed_at =Column (DateTime ,nullable =True )

    def to_dict (self ):
        session_title = None 
        if isinstance (self .job_posting_meta ,dict ):
            session_title = self .job_posting_meta .get ("session_title")
        return {
        "session_id":self .session_id ,
        "user_id":self .user_id ,
        "language":self .language ,
        "output_language":self .output_language ,
        "current_step":self .current_step ,
        "is_complete":bool (self .is_complete ),
        "session_title":session_title,
        "created_at":self .created_at .isoformat () if self .created_at else None ,
        "updated_at":self .updated_at .isoformat () if self .updated_at else None ,
        "completed_at":self .completed_at .isoformat () if self .completed_at else None ,
        "conversation_length":len (self .conversation or []),
        "score":self .score_data or {},
        "job_posting_meta":self .job_posting_meta or {}
        }


class FileType (str ,Enum ):
    PDF ="application/pdf"
    DOCX ="application/vnd.openxmlformats-officedocument.wordprocessingml.document"

class CVUploadRequest (BaseModel ):
    user_id :str =Field (...,description ="Unique user identifier")
    file_name :str =Field (...,description ="Original file name")
    use_ai :bool =Field (default =True ,description ="Use AI for parsing")

class CVStructuredData (BaseModel ):
    personal_info :Dict [str ,Any ]=Field (default_factory =dict )
    education :List [Dict [str ,Any ]]=Field (default_factory =list )
    experience :List [Dict [str ,Any ]]=Field (default_factory =list )
    skills :List [str ]=Field (default_factory =list )
    achievements :List [str ]=Field (default_factory =list )
    certifications :List [str ]=Field (default_factory =list )
    projects :List [Dict [str ,Any ]]=Field (default_factory =list )
    languages :List [Dict [str ,Any ]]=Field (default_factory =list )
    summary :Optional [str ]=None 

    class Config :
        json_schema_extra ={
        "example":{
        "personal_info":{
        "full_name":"John Doe",
        "email":"john@example.com",
        "phone":"+1-234-567-8900",
        "location":"New York, NY"
        },
        "experience":[
        {
        "position":"Software Engineer",
        "company":"Tech Corp",
        "duration":"2020-2023",
        "description":"Developed web applications...",
        "achievements":["Improved performance by 40%"]
        }
        ],
        "skills":["Python","JavaScript","React"],
        "education":[
        {
        "degree":"BS Computer Science",
        "institution":"University of Example",
        "duration":"2016-2020"
        }
        ]
        }
        }

class CVAnalysisResponse (BaseModel ):
    success :bool 
    structured_data :CVStructuredData 
    ats_score :float =Field (...,ge =0 ,le =100 )
    features :Dict [str ,Any ]
    analysis_method :str 
    processing_time :float 
    error_message :Optional [str ]=None 

class ContentGenerationRequest (BaseModel ):
    user_id :str 
    cv_context :CVStructuredData 
    conversation_history :List [Dict [str ,str ]]
    section_type :str =Field (...,description ="Type of content to generate")

class ContentGenerationResponse (BaseModel ):
    success :bool 
    generated_content :str 
    improved_section :Optional [Dict [str ,Any ]]=None 
    suggestions :Optional [List [str ]]=None 

class StartSessionRequest (BaseModel ):
    user_id :str =Field (...,description ="User ID for the session")
    language :str =Field (default ="english",description ="Language for the CV")
    initial_cv :Optional [Dict [str ,Any ]]=Field (
    default ={},
    description ="Initial CV data if any"
    )

class ChatRequest (BaseModel ):
    session_id :str =Field (...,description ="Session ID")
    message :str =Field (...,description ="Chat message")

class GenerateSectionRequest (BaseModel ):
    session_id :str =Field (...,description ="Session ID")
    section :str =Field (...,description ="CV section to generate")
    user_inputs :Dict [str ,Any ]=Field (
    default ={},
    description ="User inputs for the section"
    )

class ChatSessionResponse (BaseModel ):
    success :bool 
    session_id :str 
    message :str 
    suggestions :List [str ]=[]
    next_step :Optional [str ]=None 
    progress :Optional [float ]=None 
