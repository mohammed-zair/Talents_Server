from pydantic import BaseModel ,Field 
from typing import List ,Optional ,Dict ,Any 
from enum import Enum 

class FileType (str ,Enum ):
    PDF ="application/pdf"
    DOCX ="application/vnd.openxmlformats-officedocument.wordprocessingml.document"

class CVUploadRequest (BaseModel ):
    user_id :str =Field (...,description ="Unique user identifier")
    file_name :str =Field (...,description ="Original file name")

class CVStructuredData (BaseModel ):
    personal_info :Optional [Dict [str ,Any ]]=None 
    education :Optional [List [Dict [str ,Any ]]]=None 
    experience :Optional [List [Dict [str ,Any ]]]=None 
    skills :Optional [List [str ]]=None 
    achievements :Optional [List [str ]]=None 
    certifications :Optional [List [str ]]=None 
    projects :Optional [List [Dict [str ,Any ]]]=None 
    languages :Optional [List [Dict [str ,Any ]]]=None 
    summary :Optional [str ]=None 

class CVAnalysisResponse (BaseModel ):
    success :bool 
    structured_data :CVStructuredData 
    ats_score :float =Field (...,ge =0 ,le =100 )
    features :Dict [str ,Any ]
    analysis_method :str 
    processing_time :float 
    error_message :Optional [str ]=None 
    ai_intelligence :Optional [Dict [str ,Any ]]=None 
    cleaned_job_description :Optional [str ]=None 
    industry_ranking_score :Optional [float ]=None 
    industry_ranking_label :Optional [str ]=None 

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
    user_id :str =Field (...,description ="User ID")
    message :str =Field (...,description ="Chat message")

class GenerateSectionRequest (BaseModel ):
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
