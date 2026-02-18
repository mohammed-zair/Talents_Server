
import os 
import json 
import logging 
import re
from typing import Dict ,Any ,Optional, List
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

    def clean_job_description (self ,job_description :str )->str :
        if not job_description :
            return ""
        if not self .is_available ():
            return job_description 

        prompt =f"""
        Clean and normalize this job description. 
        - Fix corrupted text if possible.
        - Remove duplicates and boilerplate.
        - Keep it concise and professional.
        Return only the cleaned job description text.
        Job Description:
        {job_description }
        """

        try :
            response =self .client .chat .completions .create (
            model =self .model ,
            messages =[
            {"role":"system","content":"You are a professional HR editor. Return only the cleaned text."},
            {"role":"user","content":prompt }
            ],
            temperature =0.2 ,
            max_tokens =700 
            )

            return response .choices [0 ].message .content .strip ()
        except Exception as e :
            logger .error (f"Job description cleanup failed: {e }")
            return job_description 

    def generate_ai_intelligence (self ,cv_text :str ,job_description :str ="" )->Dict [str ,Any ]:
        if not self .is_available ():
            return {}

        prompt =f"""
        You are an Expert Technical Recruiter and Career Analyst.
        Analyze the CV against the job description (if provided) and return ONLY JSON.
        When ranking the candidate, compare them to a Silicon Valley standard for this role.

        CV Text:
        {cv_text }

        Job Description:
        {job_description }

        Required JSON:
        {{
          "contextual_summary": "2-3 sentence trajectory-focused bio.",
          "professional_summary": "A brief, punchy summary of their career superpower.",
          "strategic_analysis": {{
            "strengths": ["Specific achievements or evidence"],
            "weaknesses": ["Skill gaps relative to the job or industry standards"],
            "red_flags": ["Potential risks like job hopping or gaps"],
            "culture_growth_fit": ["Soft skill inferences and growth potential"]
          }},
          "ats_optimization_tips": ["Actionable ATS tips"],
          "industry_ranking_score": 0,
          "industry_ranking_label": "Top 10% for Senior Frontend roles based on Silicon Valley benchmarks.",
          "interview_questions": ["Deep-dive question 1", "Deep-dive question 2", "Deep-dive question 3"]
        }}
        """

        try :
            response =self .client .chat .completions .create (
            model =self .model ,
            messages =[
            {"role":"system","content":"You return only valid JSON. No extra text."},
            {"role":"user","content":prompt }
            ],
            temperature =0.3 ,
            max_tokens =1000 ,
            response_format ={"type":"json_object"}
            )

            return json .loads (response .choices [0 ].message .content )
        except Exception as e :
            logger .error (f"AI intelligence generation failed: {e }")
            return {}
    
    def extract_required_skills(self, job_description: str) -> List[str]:
        if not job_description:
            return []

        known_skills = [
            "python", "java", "javascript", "typescript", "react", "node", "node.js",
            "sql", "mysql", "postgresql", "mongodb", "aws", "azure", "gcp",
            "docker", "kubernetes", "fastapi", "django", "flask", "spring",
            "html", "css", "tailwind", "rest", "graphql", "git", "linux",
            "tensorflow", "pytorch", "machine learning", "data analysis",
            "communication", "leadership", "problem solving", "figma", "ui", "ux"
        ]

        lower = job_description.lower()
        found = []
        for skill in known_skills:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, lower):
                found.append(skill)

        if found:
            return sorted(list(dict.fromkeys(found)))[:20]

        tokens = re.findall(r"[a-zA-Z][a-zA-Z\+\#\.\-]{2,}", job_description.lower())
        stop_words = {
            "and", "the", "for", "with", "you", "your", "from", "this", "that",
            "are", "will", "have", "has", "our", "their", "into", "about", "years",
            "experience", "skills", "required", "preferred", "ability", "strong",
            "working", "knowledge", "team", "role"
        }
        freq = {}
        for token in tokens:
            if token in stop_words:
                continue
            freq[token] = freq.get(token, 0) + 1
        ranked = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [skill for skill, _ in ranked[:10]]

    def build_competency_matrix(self, candidate_skills: List[str], required_skills: List[str]) -> List[Dict[str, Any]]:
        normalized_candidate = {str(skill).strip().lower() for skill in (candidate_skills or []) if str(skill).strip()}
        matrix = []
        for req in required_skills:
            req_norm = str(req).strip().lower()
            matched = any(req_norm in cand or cand in req_norm for cand in normalized_candidate)
            proficiency = 88 if matched else 24
            matrix.append({
                "required_skill": req,
                "candidate_proficiency": proficiency,
                "job_target": 100,
                "is_missing": not matched
            })
        return matrix

    def generate_smart_match_pitch(self, cv_text: str, job_description: str, language: str = "en") -> str:
        if not cv_text or not job_description:
            return ""

        if not self.is_available():
            return (
                "This candidate demonstrates a strong overlap with the role requirements, "
                "bringing relevant hands-on experience, transferable technical skills, and "
                "clear execution potential for immediate impact."
            )

        arabic = str(language).lower().startswith("ar")
        instruction = (
            "Write the final paragraph in Arabic. Keep it around 150 words."
            if arabic
            else "Write the final paragraph in English. Keep it around 150 words."
        )

        prompt = f"""
        You are an elite recruiting strategist.
        Analyze CV and job description overlap and write ONE high-impact elevator pitch.
        {instruction}
        The pitch must:
        - Explain why this exact candidate is a strong fit.
        - Mention technical alignment, business impact, and growth potential.
        - Sound confident and executive-ready.
        Return plain text only.

        CV:
        {cv_text[:8000]}

        Job Description:
        {job_description[:4000]}
        """

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise recruiting writer. Return plain text only."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.35,
                max_tokens=380,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Smart match pitch generation failed: {e}")
            return ""
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
