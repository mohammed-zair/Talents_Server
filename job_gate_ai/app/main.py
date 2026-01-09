
from fastapi import FastAPI, Security 
from fastapi .middleware .cors import CORSMiddleware 
from datetime import datetime 
import os 
from dotenv import load_dotenv
from app .api .endpoints import cv_analysis ,chatbot ,interactive_builder ,export 
from app.core.security import verify_ai_auth

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), override=False)


class Settings :
    def __init__ (self ):
        self .app_name ="Job Gate AI Core"
        self .debug =os .getenv ("DEBUG","False").lower ()=="true"
        self .api_port =int (os .getenv ("API_PORT",8000 ))
        self .cors_origins =["*"]

settings =Settings ()

app =FastAPI (
title =settings .app_name ,
version ="1.0.0",
debug =settings .debug 
)


app .add_middleware (
CORSMiddleware ,
allow_origins =settings .cors_origins ,
allow_credentials =True ,
allow_methods =["*"],
allow_headers =["*"],
)


@app .get ("/")
async def root ():
    return {
    "message":"Welcome to Job Gate AI Core",
    "status":"operational",
    "version":"1.0.0",
    "timestamp":datetime .now ().isoformat ()
    }

@app .get ("/health")
async def health_check ():
    return {
    "status":"healthy",
    "service":"AI Core",
    "timestamp":datetime .now ().isoformat ()
    }

@app .get ("/debug/auth")
async def debug_auth ():
    return {
    "auth_mode":os .getenv ("AI_CORE_AUTH_MODE","apikey"),
    "jwt_secret_present":bool (os .getenv ("AI_CORE_JWT_SECRET","")),
    "jwt_issuer":os .getenv ("AI_CORE_JWT_ISSUER","jobgate-backend"),
    "jwt_audience":os .getenv ("AI_CORE_JWT_AUDIENCE","jobgate-ai-core"),
    "timestamp":datetime .now ().isoformat ()
    }


try :
    from app .api .endpoints import cv_analysis ,chatbot ,interactive_builder ,export 

    app .include_router (cv_analysis .router, dependencies=[Security(verify_ai_auth)] )
    app .include_router (chatbot .router, dependencies=[Security(verify_ai_auth)] )
    app .include_router (interactive_builder .router, dependencies=[Security(verify_ai_auth)] )
    app .include_router (export .router, dependencies=[Security(verify_ai_auth)] )

    print ("✅ All routers loaded successfully")
    print ("Available endpoints:")
    print ("- POST   /cv/analyze         - Analyze CV file")
    print ("- POST   /cv/analyze-text    - Analyze CV text")
    print ("- GET    /cv/history/{user_id} - Get CV history")
    print ("- GET    /cv/status          - Service status")
    print ("- POST   /chatbot/start      - Start chatbot")
    print ("- POST   /chatbot/chat       - Chat with bot")
    print ("- POST   /builder/start      - Start CV builder")
    print ("- GET    /health             - Health check")

except Exception as e :
    print (f"❌ Error loading routers: {e }")
    import traceback 
    traceback .print_exc ()

@app .post ("/test-cv")
async def test_cv_analysis (request :dict ):
    """Simple test endpoint for CV analysis"""
    text =request .get ("text","")

    return {
    "success":True ,
    "test":"working",
    "text_length":len (text ),
    "has_email":"@"in text ,
    "score":85 ,
    "structured_data":{
    "personal_info":{"name":"Test from endpoint"},
    "skills":["Python","Testing"]
    }
    }
