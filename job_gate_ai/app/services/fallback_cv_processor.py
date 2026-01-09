import json 
import re 
from typing import Dict ,Any ,List 

class FallbackCVProcessor :
    """Fallback CV processor when LLM is not available"""

    @staticmethod 
    def structure_cv_fallback (raw_text :str )->Dict [str ,Any ]:
        """Parse CV text without LLM"""


        cleaned_text =raw_text .replace ('•','-').replace ('','').strip ()
        lines =[line .strip ()for line in cleaned_text .split ('\n')if line .strip ()]


        result ={
        "personal_info":{
        "full_name":"",
        "email":"",
        "phone":"",
        "location":""
        },
        "education":[],
        "experience":[],
        "skills":[],
        "certifications":[],
        "languages":[]
        }


        email_pattern =r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails =re .findall (email_pattern ,raw_text )
        if emails :
            result ["personal_info"]["email"]=emails [0 ]


        phone_pattern =r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        phones =re .findall (phone_pattern ,raw_text )
        if phones :
            result ["personal_info"]["phone"]=phones [0 ]


        for i ,line in enumerate (lines ):
            line_lower =line .lower ()
            if any (keyword in line_lower for keyword in ["name","اسم","mohammed","ahmed","ali"]):
                if i +1 <len (lines ):
                    result ["personal_info"]["full_name"]=lines [i +1 ]
                else :
                    result ["personal_info"]["full_name"]=line 
                break 

        return result 

    @staticmethod 
    def parse_simple_cv (raw_text :str )->Dict [str ,Any ]:
        """Parse simple CV format"""

        lines =[line .strip ()for line in raw_text .split ('\n')if line .strip ()]

        result ={
        "personal_info":{
        "full_name":"",
        "email":"",
        "phone":"",
        "location":""
        },
        "education":[],
        "experience":[],
        "skills":[],
        "certifications":[],
        "languages":[]
        }

        current_section =None 

        for line in lines :
            line_lower =line .lower ()

            if "name:"in line_lower or "الاسم:"in line :
                result ["personal_info"]["full_name"]=line .split (":",1 )[1 ].strip ()if ":"in line else line 
            elif "email:"in line_lower or "@"in line :
                if ":"in line :
                    result ["personal_info"]["email"]=line .split (":",1 )[1 ].strip ()
                else :
                    result ["personal_info"]["email"]=line 

            if "skills:"in line_lower or "مهارات:"in line :
                current_section ="skills"
                continue 

            if current_section =="skills":
                skills =[s .strip ()for s in line .split (",")if s .strip ()]
                result ["skills"].extend (skills )

        return result 

    @staticmethod 
    def calculate_basic_ats_score (raw_text :str )->Dict [str ,Any ]:
        """Calculate basic ATS score"""

        score =0 
        feedback =[]
        features ={}

        text_lower =raw_text .lower ()


        if len (raw_text )>100 :
            score +=20 
            feedback .append ("✅ Has content")

        email_pattern =r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        if re .search (email_pattern ,raw_text ):
            score +=20 
            feedback .append ("✅ Has email")

        if "experience"in text_lower or "خبرة"in text_lower :
            score +=20 
            feedback .append ("✅ Mentions experience")

        if "skill"in text_lower or "مهارة"in text_lower :
            score +=20 
            feedback .append ("✅ Mentions skills")

        if "education"in text_lower or "تعليم"in text_lower :
            score +=20 
            feedback .append ("✅ Mentions education")

        return {
        "score":min (score ,100 ),
        "feedback":feedback ,
        "features":{"score":score }
        }
