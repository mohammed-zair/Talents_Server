
import json 
import os 
from typing import Dict ,Any ,Optional 
from openai import OpenAI 

class DeepSeekService :
    def __init__ (self ):
        self .api_key =os .getenv ("OPENROUTER_API_KEY","")
        self .base_url =os .getenv ("LLM_BASE_URL","https://openrouter.ai/api/v1")
        self .model =os .getenv ("LLM_MODEL","deepseek/deepseek-chat")

        if not self .api_key :
            print ("⚠️ WARNING: OPENROUTER_API_KEY not set. DeepSeek service will be unavailable.")
            self .client =None 
        else :
            self .client =OpenAI (
            api_key =self .api_key ,
            base_url =self .base_url 
            )
            print (f"✅ DeepSeek service initialized with model: {self .model }")

    def is_available (self )->bool :
        return self .client is not None 

    async def structure_cv (self ,raw_text :str )->Dict [str ,Any ]:
        if not self .is_available ():
            raise Exception ("DeepSeek service not available")


        truncated_text =raw_text [:3000 ]if len (raw_text )>3000 else raw_text 

        prompt =f"""
        Parse this CV text and extract structured information.
        
        CV Text:
        {truncated_text }
        
        Return ONLY valid JSON with this structure:
        {{
          "personal_info": {{
            "full_name": "",
            "email": "",
            "phone": "",
            "location": ""
          }},
          "education": [],
          "experience": [],
          "skills": [],
          "certifications": [],
          "languages": []
        }}
        
        Rules:
        1. Extract all available information
        2. Clean and format properly
        3. Return only JSON
        """

        try :
            response =self .client .chat .completions .create (
            model =self .model ,
            messages =[
            {"role":"system","content":"You are a CV parser. Return only valid JSON."},
            {"role":"user","content":prompt }
            ],
            temperature =0.1 ,
            max_tokens =2000 ,
            response_format ={"type":"json_object"}
            )

            result =json .loads (response .choices [0 ].message .content )
            return result 

        except Exception as e :
            print (f"❌ DeepSeek error: {e }")
            raise 

    async def generate_content (self ,context :Dict [str ,Any ])->str :
        if not self .is_available ():
            return "AI content generation unavailable"

        prompt =f"""
        Generate professional CV content based on this context:
        {json .dumps (context ,ensure_ascii =False )[:1000 ]}
        """

        try :
            response =self .client .chat .completions .create (
            model =self .model ,
            messages =[
            {"role":"system","content":"You are a professional CV writer."},
            {"role":"user","content":prompt }
            ],
            temperature =0.7 ,
            max_tokens =500 
            )

            return response .choices [0 ].message .content 

        except Exception as e :
            print (f"❌ Content generation error: {e }")
            return "Error generating content"