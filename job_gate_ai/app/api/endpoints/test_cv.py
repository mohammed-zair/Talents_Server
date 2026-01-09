from fastapi import APIRouter ,HTTPException 
from typing import Optional 
from pydantic import BaseModel 

router =APIRouter (prefix ="/test",tags =["Test CV Processing"])


class CVTextRequest (BaseModel ):
    cv_text :str 
    user_id :Optional [str ]=None 

@router .post ("/analyze-text")
async def analyze_cv_text (request :CVTextRequest ):
    try :

        from app .services .fallback_service import FallbackCVProcessor 

        print (f"Analyzing CV text. Length: {len (request .cv_text )}")


        structured_data =FallbackCVProcessor .structure_cv_fallback (request .cv_text )


        ats_result =FallbackCVProcessor .calculate_basic_ats_score (request .cv_text )

        return {
        "success":True ,
        "structured_data":structured_data ,
        "ats_score":ats_result ["score"],
        "features":{
        "raw_text_length":len (request .cv_text ),
        "feedback":ats_result ["feedback"],
        **ats_result ["features"]
        },
        "error_message":None 
        }

    except Exception as e :
        print (f"CV Analysis Error: {e }")
        return {
        "success":False ,
        "structured_data":{},
        "ats_score":0.0 ,
        "features":{},
        "error_message":str (e )
        }

@router .get ("/health")
async def test_health ():
    return {"status":"Test CV endpoints are working"}