from typing import Dict ,Any ,List 

class ATSScorer :
    def __init__ (self ):
        self .rules ={
        "has_contact_info":10 ,
        "has_work_experience":20 ,
        "has_education":15 ,
        "has_skills_section":10 ,
        "has_quantifiable_achievements":15 ,
        "proper_formatting":10 ,
        "has_projects":15 ,
        "keyword_density":20 
        }
    def extract_cv_features (self ,structured_data :Dict )->Dict [str ,Any ]:
        return {
        "key_skills":structured_data .get ("skills",[]),
        "total_years_experience":self ._calculate_years_experience (
        structured_data .get ("experience",[])
        ),
        "achievement_count":self ._count_quantifiable_achievements (structured_data ),
        "has_education":len (structured_data .get ("education",[]))>0 ,
        "has_certifications":len (structured_data .get ("certifications",[]))>0 ,
        "has_languages":len (structured_data .get ("languages",[]))>0 
        ,
        "project_count": len(structured_data.get("projects", [])),
        "project_names": [p.get("title","") for p in structured_data.get("projects", [])]
        }

    def calculate_score (self ,structured_cv :Dict [str ,Any ],job_description :str ="" ,weights :Dict [str ,float ]=None )->Dict [str ,Any ]:

        score =0 
        feedback =[]
        features ={}
        weights =weights or {}


        if structured_cv .get ("personal_info",{}).get ("email"):
            score +=self .rules ["has_contact_info"]
            feedback .append ("✅ Has contact information")
        else :
            feedback .append ("❌ Missing contact information")


        if structured_cv .get ("experience")and len (structured_cv ["experience"])>0 :
            score +=self .rules ["has_work_experience"]
            feedback .append ("✅ Has work experience section")
            features ["years_experience"]=self ._calculate_years_experience (structured_cv ["experience"])
        else :
            feedback .append ("❌ Missing work experience section")


        if structured_cv .get ("education")and len (structured_cv ["education"])>0 :
            score +=self .rules ["has_education"]
            feedback .append ("✅ Has education section")
        else :
            feedback .append ("❌ Missing education section")


        if structured_cv .get ("skills")and len (structured_cv ["skills"])>0 :
            score +=self .rules ["has_skills_section"]
            feedback .append ("✅ Has skills section")
            features ["skills_count"]=len (structured_cv ["skills"])
            features ["key_skills"]=structured_cv ["skills"][:10 ]
        else :
            feedback .append ("❌ Missing skills section")

        # Projects scoring
        if structured_cv.get("projects") and len(structured_cv.get("projects"))>0:
            score += self.rules["has_projects"]
            feedback.append(f"✅ Has projects ({len(structured_cv.get('projects'))})")
            features["project_count"] = len(structured_cv.get("projects"))
            features["project_names"] = [p.get("title","") for p in structured_cv.get("projects",[])]
        else:
            feedback.append("❌ Missing projects section")


        quantifiable_count =self ._count_quantifiable_achievements (structured_cv )
        if quantifiable_count >0 :
            score +=self .rules ["has_quantifiable_achievements"]
            feedback .append (f"✅ Has {quantifiable_count } quantifiable achievements")
            features ["achievement_count"]=quantifiable_count 
        else :
            feedback .append ("❌ Missing quantifiable achievements")

        keyword_bonus =0 
        if job_description and structured_cv .get ("skills"):
            job_lower =job_description .lower ()
            matched =[
            skill for skill in structured_cv .get ("skills",[])
            if isinstance (skill ,str )and skill .lower ()in job_lower 
            ]
            if matched :
                keyword_bonus =min (10 ,len (matched )*2 )
                score +=keyword_bonus 
                features ["keyword_matches"]=matched 
                feedback .append (f"âœ… Matched {len(matched)} job keywords")

        impact_bonus =0 
        if quantifiable_count >0 :
            impact_bonus =round (score *0.1 ,2 )
            score +=impact_bonus 
            features ["impact_bonus"]=impact_bonus 

        return {
        "score":min (score ,100 ),
        "feedback":feedback ,
        "features":features 
        }

    def _calculate_years_experience (self ,experience :List [Dict [str ,Any ]])->float :
        return len (experience )*1.5 

    def _count_quantifiable_achievements (self ,cv :Dict [str ,Any ])->int :
        count =0 

        for exp in cv .get ("experience",[]):
            for achievement in exp .get ("achievements",[]):

                if any (char .isdigit ()for char in str (achievement )):
                    count +=1 
        return count 

    def check_arabic_specific_rules (self ,structured_data :Dict )->List [str ]:
        feedback =[]


        personal_info =structured_data .get ("personal_info",{})


        if not any (arabic_char in personal_info .get ("full_name","")
        for arabic_char in "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"):
            feedback .append ("⚠️ Name might not be in Arabic format")


        skills =structured_data .get ("skills",[])
        arabic_skills =[s for s in skills if any (arabic_char in s for arabic_char in "ابتثجحخدذرزسشصضطظعغفقكلمنهوي")]
        if len (arabic_skills )<len (skills )/2 :
            feedback .append ("⚠️ Consider adding Arabic skill descriptions")

        return feedback 
