import os 
from typing import List 

class Settings :
    def __init__ (self ):

        self .app_name ="Job Gate AI Core"
        self .debug =os .getenv ("DEBUG","False").lower ()=="true"
        self .api_port =int (os .getenv ("API_PORT",8000 ))


        self .openai_api_key =os .getenv ("OPENAI_API_KEY","")
        self .openrouter_api_key =os .getenv ("OPENROUTER_API_KEY","")
        self .llm_base_url =os .getenv ("LLM_BASE_URL","https://api.openai.com/v1")
        self .llm_model =os .getenv ("LLM_MODEL","gpt-4o")


        cors_str =os .getenv ("CORS_ORIGINS","http://localhost:3000")
        self .cors_origins =[origin .strip ()for origin in cors_str .split (",")]


        self .max_file_size =int (os .getenv ("MAX_FILE_SIZE",10485760 ))
        allowed_str =os .getenv (
        "ALLOWED_FILE_TYPES",
        "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        self .allowed_file_types =[ftype .strip ()for ftype in allowed_str .split (",")]

settings =Settings ()