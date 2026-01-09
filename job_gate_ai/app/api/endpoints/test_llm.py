
from fastapi import APIRouter ,HTTPException 
from pydantic import BaseModel 
from app .services .deepseek_service import DeepSeekService 

router =APIRouter (prefix ="/test-llm",tags =["LLM Testing"])

class LLMTestRequest (BaseModel ):
    text :str 
    task :str ="structure"

@router .post ("/test-deepseek")
async def test_deepseek (request :LLMTestRequest ):
    try :
        deepseek =DeepSeekService ()

        if request .task =="structure":
            result =await deepseek .structure_cv_arabic (request .text )
        elif request .task =="generate":
            result =await deepseek .generate_arabic_content (
            {"section":"experience"},
            "experience"
            )
        elif request .task =="improve":
            result =await deepseek .improve_cv_section (
            request .text ,
            "experience"
            )
        else :
            raise ValueError ("Invalid task")

        return {
        "success":True ,
        "result":result ,
        "model":"deepseek-chat"
        }

    except Exception as e :
        raise HTTPException (status_code =500 ,detail =f"LLM Error: {str (e )}")