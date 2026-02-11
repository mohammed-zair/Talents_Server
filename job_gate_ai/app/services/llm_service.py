
import os 
import json 
import logging 
from typing import Dict ,Any ,Optional 
from openai import OpenAI 

logger =logging .getLogger (__name__ )

class LLMService :
    def __init__ (self ):
        self .api_key =os .getenv ("OPENROUTER_API_KEY","")
        self .base_url =os .getenv ("LLM_BASE_URL","https://openrouter.ai/api/v1")
        self .model =os .getenv ("LLM_MODEL","deepseek/deepseek-chat")

        if not self .api_key :
            logger .warning ("No OpenRouter API key found. LLM features will be limited.")
            self .client =None 
        else :
            try :
                self .client =OpenAI (
                api_key =self .api_key ,
                base_url =self .base_url ,
                timeout =30.0 
                )
                logger .info (f"✅ LLM Service initialized with model: {self .model }")
            except Exception as e :
                logger .error (f"❌ Failed to initialize LLM client: {e }")
                self .client =None 

    def is_available (self )->bool :
        return self .client is not None 

    def parse_cv_text (self ,text :str ,use_ai :bool =True )->Dict [str ,Any ]:
        try :
            if use_ai and self .is_available ():
                return self ._parse_with_ai (text )
            else :
                return self ._parse_with_fallback (text )
        except Exception as e :
            logger .error (f"Error parsing CV text: {e }")
            return self ._create_minimal_structure (text )

    def _parse_with_ai (self ,text :str )->Dict [str ,Any ]:

        if len (text )>10000 :
            text =text [:10000 ]+"\n[Text truncated due to length]"

        prompt =f"""
        Parse this CV text and extract structured information.
        
        CV Text:
        {text }
        
        Return ONLY valid JSON with this structure:
        {{
            "personal_info": {{
                "name": "",
                "email": "",
                "phone": "",
                "location": ""
            }},
            "education": [],
            "experience": [],
            "skills": [],
            "projects": [],
            "certifications": [],
            "languages": []
        }}
        
        Rules:
        1. Extract all available information
        2. Clean text properly
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
            logger .error (f"AI parsing failed: {e }")

            return self ._parse_with_fallback (text )

    def _parse_with_fallback (self ,text :str )->Dict [str ,Any ]:
        import re 

        result ={
        "personal_info":{},
        "education":[],
        "experience":[],
        "skills":[],
        "projects":[],
        "certifications":[],
        "languages":[]
        }



        email_pattern =r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails =re .findall (email_pattern ,text )
        if emails :
            result ["personal_info"]["email"]=emails [0 ]


        phone_pattern =r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]'
        phones =re .findall (phone_pattern ,text )
        if phones :
            result ["personal_info"]["phone"]=phones [0 ]


        common_skills =["python","java","javascript","react","sql","aws","docker"]
        found_skills =[]
        for skill in common_skills :
            if skill .lower ()in text .lower ():
                found_skills .append (skill .title ())

        result ["skills"]=found_skills 

        return result 

    def _create_minimal_structure (self ,text :str )->Dict [str ,Any ]:
        return {
        "personal_info":{
        "summary":text [:500 ]+"..."if len (text )>500 else text 
        },
        "education":[],
        "experience":[],
        "skills":[],
        "projects":[],
        "certifications":[],
        "languages":[]
        }

    def generate_content (self ,section_type :str ,context :Dict [str ,Any ])->str :
        if not self .is_available ():
            return f"Content for {section_type } will be generated here."

        prompt =f"""
        Generate professional {section_type } content for a CV.
        
        Context: {json .dumps (context ,ensure_ascii =False )[:1000 ]}
        
        Requirements:
        1. Professional language
        2. Focus on achievements
        3. Use bullet points if appropriate
        4. Include quantifiable results
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

            return response .choices [0 ].message .content .strip ()

        except Exception as e :
            logger .error (f"Content generation failed: {e }")
            return f"Professional {section_type } content."

    def translate_text (self ,text :str ,target_language :str ="english")->str :
        if not text :
            return text 
        if not self .is_available ():
            return text 

        prompt =f"""
        Translate the following text to {target_language}.
        Keep names, emails, and URLs unchanged.
        Return only the translated text without extra commentary.
        Text:
        {text }
        """

        try :
            response =self .client .chat .completions .create (
            model =self .model ,
            messages =[
            {"role":"system","content":"You are a professional translator."},
            {"role":"user","content":prompt }
            ],
            temperature =0.2 ,
            max_tokens =800 
            )

            return response .choices [0 ].message .content .strip ()
        except Exception as e :
            logger .error (f"Translation failed: {e }")
            return text 
