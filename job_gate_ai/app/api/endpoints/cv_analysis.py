import hashlib 
import os 
import tempfile 
import traceback 
from datetime import datetime 
from typing import Dict ,Optional, Union, List 

from fastapi import APIRouter ,File ,HTTPException ,UploadFile ,Form 
from fastapi .responses import JSONResponse 
from pydantic import BaseModel

from app .models .schemas import CVStructuredData ,CVAnalysisResponse 
from app .services .database_service import DatabaseService 
from app .services .file_parser import FileParserService 
from app .services .ats_scorer import ATSScorer 
from app .services .llm_service import LLMService 
from app .services .fallback_service import FallbackCVProcessor 

router =APIRouter (prefix ="/cv",tags =["CV Analysis"])

db_service =DatabaseService ()
file_parser =FileParserService ()
llm_service =LLMService ()
ats_scorer =ATSScorer ()

def _normalize_structured_data(structured_data: Dict) -> Dict:
    if not isinstance(structured_data, dict):
        structured_data = {}

    def as_dict(v):
        return v if isinstance(v, dict) else {}

    def as_list(v):
        return v if isinstance(v, list) else []

    def as_dict_list(v, item_key: str = "value"):
        if v is None:
            return []
        if isinstance(v, list):
            out = []
            for item in v:
                if isinstance(item, dict):
                    out.append(item)
                elif isinstance(item, str):
                    s = item.strip()
                    if s:
                        out.append({item_key: s})
                else:
                    s = str(item).strip()
                    if s and s.lower() != "none":
                        out.append({item_key: s})
            return out
        if isinstance(v, dict):
            return [v]
        if isinstance(v, str):
            s = v.strip()
            return [{item_key: s}] if s else []
        s = str(v).strip()
        return [{item_key: s}] if s else []

    def as_str_list(v):
        if v is None:
            return []
        if isinstance(v, list):
            out = []
            for item in v:
                if isinstance(item, str):
                    s = item.strip()
                    if s:
                        out.append(s)
                else:
                    s = str(item).strip()
                    if s and s.lower() != "none":
                        out.append(s)
            return out
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return [str(v).strip()] if str(v).strip() else []

    normalized = {
        "personal_info": as_dict(structured_data.get("personal_info")),
        "education": as_dict_list(structured_data.get("education"), item_key="entry"),
        "experience": as_dict_list(structured_data.get("experience"), item_key="entry"),
        "skills": as_str_list(structured_data.get("skills")),
        "achievements": as_str_list(structured_data.get("achievements")),
        "certifications": as_str_list(structured_data.get("certifications")),
        "projects": as_dict_list(structured_data.get("projects"), item_key="entry"),
        "languages": as_dict_list(structured_data.get("languages"), item_key="name"),
        "summary": structured_data.get("summary") if isinstance(structured_data.get("summary"), str) else "",
    }

    return normalized

@router .post ("/analyze",response_model =CVAnalysisResponse )
async def analyze_cv (
user_id :str ,
file :UploadFile =File (...),
use_ai :bool =True ,
job_description :Optional [str ]=Form (None )
):
    """
    Analyze uploaded CV file and extract structured data with ATS scoring
    """
    try :
        print (f"[CV Analysis] Starting CV analysis for: {file .filename }, user: {user_id }, AI: {use_ai }")


        allowed_types =[
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]

        if file .content_type not in allowed_types :
            return JSONResponse (
            status_code =400 ,
            content ={
            "success":False ,
            "error":f"File type not supported. Supported: {', '.join (allowed_types )}"
            }
            )


        file_content =await file .read ()
        file_size =len (file_content )


        MAX_SIZE =10 *1024 *1024 

        if file_size >MAX_SIZE :
            return JSONResponse (
            status_code =400 ,
            content ={
            "success":False ,
            "error":f"File too large. Max size: {MAX_SIZE /1024 /1024 }MB, your file: {file_size /1024 /1024 :.2f}MB"
            }
            )

        if file_size ==0 :
            return JSONResponse (
            status_code =400 ,
            content ={"success":False ,"error":"Uploaded file is empty"}
            )


        await file .seek (0 )


        file_hash =hashlib .md5 (file_content ).hexdigest ()
        print (f"File hash: {file_hash[:8]}..., Size: {file_size} bytes")


        suffix =".pdf"if "pdf"in file .content_type else ".docx"
        temp_path =None 
        try :
            with tempfile .NamedTemporaryFile (delete =False ,suffix =suffix ,mode ='wb')as temp_file :
                temp_file .write (file_content )
                temp_path =temp_file .name 


            raw_text =await file_parser .parse_file (file_content ,file .content_type )
            if not raw_text or len (raw_text .strip ())<10 :
                return JSONResponse (
                status_code =400 ,
                content ={"success":False ,"error":"Could not extract text from file"}
                )

            print (f"Extracted {len(raw_text)} characters")


            start_time =datetime .now ()

            if use_ai and llm_service .is_available ():
                print ("Using AI parsing...")
                try :
                    structured_data =llm_service .parse_cv_text (raw_text ,use_ai =True )
                    analysis_method ="ai"
                except Exception as ai_error :
                    print (f"AI parsing failed, using fallback: {ai_error}")
                    structured_data =FallbackCVProcessor .structure_cv_fallback (raw_text )
                    analysis_method ="ai_fallback"
            else :
                print ("Using fallback parsing...")
                structured_data =FallbackCVProcessor .structure_cv_fallback (raw_text )
                analysis_method ="fallback"

            processing_time =(datetime .now ()-start_time ).total_seconds ()
            print (f"Parsing took {processing_time:.2f} seconds")


            cleaned_job_description =llm_service .clean_job_description (job_description or "") if job_description else ""
            ats_result =ats_scorer .calculate_score (structured_data ,cleaned_job_description )
            ats_score =ats_result .get ("score",0.0 )
            print (f"ATS Score: {ats_score}")


            features =ats_scorer .extract_cv_features (structured_data )
            features .update (ats_result .get ("features",{}))


            structured_data = _normalize_structured_data(structured_data)
            cv_structured_data =CVStructuredData (**structured_data )
            required_skills = llm_service.extract_required_skills(cleaned_job_description)
            competency_matrix = llm_service.build_competency_matrix(
                structured_data.get("skills", []),
                required_skills
            )


            try :
                import asyncio 
                asyncio.create_task(asyncio.to_thread(db_service.save_cv_analysis, {
                "user_id":user_id ,
                "file_name":file .filename ,
                "file_hash":file_hash ,
                "structured_data":structured_data ,
                "ats_score":ats_score ,
                "features":features ,
                "analysis_method":analysis_method ,
                "processing_time":processing_time ,
                "file_path":temp_path 
                }))
                print ("Database save queued")
            except Exception as db_error :
                print (f"Database save error (non-critical): {db_error}")


            ai_intelligence =llm_service .generate_ai_intelligence (raw_text ,cleaned_job_description ) if use_ai else {}
            try :
                if isinstance (ai_intelligence ,dict ):
                    print (f"[CV Analysis] AI intelligence keys: {list (ai_intelligence .keys ())}")
                else :
                    print (f"[CV Analysis] AI intelligence type: {type (ai_intelligence )}")
            except Exception as log_error :
                print (f"[CV Analysis] AI intelligence log failed: {log_error }")

            return CVAnalysisResponse (
            success =True ,
            structured_data =cv_structured_data ,
            ats_score =ats_score ,
            features =features ,
            analysis_method =analysis_method ,
            processing_time =processing_time ,
            error_message =None ,
            ai_intelligence =ai_intelligence ,
            competency_matrix =competency_matrix ,
            cleaned_job_description =cleaned_job_description ,
            industry_ranking_score =ai_intelligence .get ("industry_ranking_score") if isinstance (ai_intelligence ,dict ) else None ,
            industry_ranking_label =ai_intelligence .get ("industry_ranking_label") if isinstance (ai_intelligence ,dict ) else None 
            )

        finally :

            if temp_path and os .path .exists (temp_path ):
                try :
                    import asyncio 
                    async def cleanup ():
                        await asyncio.sleep(300)
                        try:
                            os.unlink(temp_path)
                            print(f"Cleaned temp file: {temp_path}")
                        except:
                            pass
                    asyncio.create_task(cleanup())
                except :
                    pass 

    except HTTPException :
        raise 
    except Exception as e :
        print (f"CV analysis error: {str(e)}")
        traceback .print_exc ()

        return CVAnalysisResponse (
        success =False ,
        structured_data =CVStructuredData (),
        ats_score =0.0 ,
        features ={},
        analysis_method ="error",
        processing_time =0.0 ,
        error_message =str (e )
        )

class CVTextAnalyzeRequest(BaseModel):
    user_id: Union[str, int]
    cv_text: str
    use_ai: bool = True
    job_description: Optional[str] = None

class GeneratePitchRequest(BaseModel):
    cv_text: str
    job_description: str
    language: Optional[str] = "en"

@router .post ("/analyze-text")
async def analyze_cv_text (request: CVTextAnalyzeRequest):
    """
    Analyze CV text directly
    """
    try :
        user_id = str(request.user_id)
        cv_text = request.cv_text
        use_ai = request.use_ai

        print (f"Analyzing CV text for user: {user_id}, AI: {use_ai}")

        if not cv_text or len (cv_text .strip ())<10 :
            return JSONResponse (
            status_code =400 ,
            content ={"success":False ,"error":"Text is too short or empty"}
            )

        start_time =datetime .now ()


        if use_ai and llm_service .is_available ():
            print ("Using AI parsing for text...")
            try :
                structured_data =llm_service .parse_cv_text (cv_text ,use_ai =True )
                analysis_method ="ai"
            except Exception as ai_error :
                print (f"AI parsing failed: {ai_error}")
                structured_data =FallbackCVProcessor .structure_cv_fallback (cv_text )
                analysis_method ="ai_fallback"
        else :
            print ("Using fallback parsing...")
            structured_data =FallbackCVProcessor .structure_cv_fallback (cv_text )
            analysis_method ="fallback"

        processing_time =(datetime .now ()-start_time ).total_seconds ()


        cleaned_job_description =llm_service .clean_job_description (request.job_description or "") if request.job_description else ""
        ats_result =ats_scorer .calculate_score (structured_data ,cleaned_job_description )
        required_skills = llm_service.extract_required_skills(cleaned_job_description)
        competency_matrix = llm_service.build_competency_matrix(
            structured_data.get("skills", []),
            required_skills
        )


        features =ats_scorer .extract_cv_features (structured_data )
        features .update (ats_result .get ("features",{}))


        try :
            import asyncio 
            file_hash =hashlib .md5 (cv_text .encode ()).hexdigest ()
            asyncio.create_task(asyncio.to_thread(db_service.save_cv_analysis, {
            "user_id":user_id ,
            "file_name":"text_input.txt",
            "file_hash":file_hash ,
            "structured_data":structured_data ,
            "ats_score":ats_result .get ("score",0.0 ),
            "features":features ,
            "analysis_method":analysis_method ,
            "processing_time":processing_time ,
            "file_path":None 
            }))
        except Exception as db_error :
            print (f"Database save error: {db_error}")

        ai_intelligence =llm_service .generate_ai_intelligence (cv_text ,cleaned_job_description ) if use_ai else {}
        try :
            if isinstance (ai_intelligence ,dict ):
                print (f"[CV Text Analysis] AI intelligence keys: {list (ai_intelligence .keys ())}")
            else :
                print (f"[CV Text Analysis] AI intelligence type: {type (ai_intelligence )}")
        except Exception as log_error :
            print (f"[CV Text Analysis] AI intelligence log failed: {log_error }")

        return {
        "success":True ,
        "user_id":user_id ,
        "structured_data":structured_data ,
        "ats_score":ats_result .get ("score",0.0 ),
        "features":features ,
        "analysis_method":analysis_method ,
        "processing_time":processing_time ,
        "feedback":ats_result .get ("feedback",[]),
        "competency_matrix":competency_matrix,
        "text_length":len (cv_text ),
        "ai_intelligence":ai_intelligence ,
        "cleaned_job_description":cleaned_job_description ,
        "industry_ranking_score":ai_intelligence .get ("industry_ranking_score") if isinstance (ai_intelligence ,dict ) else None ,
        "industry_ranking_label":ai_intelligence .get ("industry_ranking_label") if isinstance (ai_intelligence ,dict ) else None 
        }

    except Exception as e :
        print (f"Text analysis error: {e}")
        traceback .print_exc ()

        return JSONResponse (
        status_code =500 ,
        content ={
        "success":False ,
        "error":str (e )
        }
        )

@router.post("/generate-pitch")
async def generate_match_pitch(request: GeneratePitchRequest):
    try:
        if not request.cv_text or len(request.cv_text.strip()) < 20:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "cv_text is too short"}
            )

        if not request.job_description or len(request.job_description.strip()) < 20:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "job_description is too short"}
            )

        pitch = llm_service.generate_smart_match_pitch(
            request.cv_text,
            request.job_description,
            request.language or "en"
        )

        cleaned_job_description = llm_service.clean_job_description(request.job_description)
        required_skills = llm_service.extract_required_skills(cleaned_job_description)

        return {
            "success": True,
            "pitch": pitch,
            "language": request.language or "en",
            "required_skills": required_skills,
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@router .get ("/history/{user_id}")
async def get_cv_history (user_id :str ,limit :int =20 ):
    """
    Get CV analysis history for a user
    """
    try :
        analyses =db_service .get_user_cv_analyses (user_id ,limit )

        return {
        "success":True ,
        "user_id":user_id ,
        "analyses":analyses ,
        "count":len (analyses ),
        "timestamp":datetime .now ().isoformat ()
        }

    except Exception as e :
        print (f"Error getting CV history: {e}")

        return JSONResponse (
        status_code =500 ,
        content ={
        "success":False ,
        "error":str (e )
        }
        )

@router .get ("/status")
async def get_cv_analysis_status ():
    """
    Get CV analysis service status
    """
    try :

        db_test =False 
        try :
            test_analyses =db_service .get_user_cv_analyses ("test",1 )
            db_test =True 
        except :
            db_test =False 

        return {
        "status":"operational",
        "llm_available":llm_service .is_available (),
        "database_connected":db_test ,
        "services":{
        "file_parsing":"available"if hasattr (file_parser ,'parse_file')else "unavailable",
        "ats_scoring":"available"if hasattr (ats_scorer ,'calculate_score')else "unavailable",
        "llm_service":"available"if llm_service .is_available ()else "unavailable"
        },
        "timestamp":datetime .now ().isoformat (),
        "version":"1.0.0"
        }

    except Exception as e :
        print (f"Status check error: {e}")

        return {
        "status":"degraded",
        "error":str (e ),
        "timestamp":datetime .now ().isoformat ()
        }

@router .get ("/features/{cv_id}")
async def get_cv_features (cv_id :int ):
    """
    Get extracted features for a specific CV analysis
    """
    try :


        return {
        "success":True ,
        "cv_id":cv_id ,
        "features":{
        "key_skills":["Python","FastAPI","Machine Learning"],
        "years_experience":3.5 ,
        "achievement_count":8 ,
        "ats_score":78.5 ,
        "has_quantifiable_results":True ,
        "sections_complete":["experience","education","skills"]
        },
        "metadata":{
        "retrieved_at":datetime .now ().isoformat (),
        "placeholder":True 
        }
        }
    except Exception as e :
        print (f"Error getting features: {e}")

        return JSONResponse (
        status_code =500 ,
        content ={
        "success":False ,
        "error":str (e )
        }
        )

