import json 
import re 
from typing import Dict ,Any ,List 

class FallbackCVProcessor :

    @staticmethod 
    def structure_cv_fallback (raw_text :str )->Dict [str ,Any ]:


        simple_result =FallbackCVProcessor .parse_simple_cv (raw_text )


        if (simple_result ["personal_info"]["full_name"] or simple_result ["personal_info"]["email"]) and (len (simple_result ["experience"])>0 or len (simple_result ["skills"])>0):
            return simple_result 


        return FallbackCVProcessor ._structure_complex_cv (raw_text )

    @staticmethod 
    def _structure_complex_cv (raw_text :str )->Dict [str ,Any ]:


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
        "languages":[],
        "projects":[]
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


        if not result ["personal_info"]["full_name"]:
            for line in lines :
                if not re .search (email_pattern ,line )and not re .search (phone_pattern ,line ):
                    if len (line .split ())>=2 :
                        result ["personal_info"]["full_name"]=line 
                        break 


        location_keywords =["damascus","دمشق","riyadh","الرياض","location","موقع"]
        for i ,line in enumerate (lines ):
            line_lower =line .lower ()
            if any (keyword in line_lower for keyword in location_keywords ):
                if ":"in line :
                    result ["personal_info"]["location"]=line .split (":",1 )[1 ].strip ()
                elif i +1 <len (lines ):
                    result ["personal_info"]["location"]=lines [i +1 ]
                break 


        education_keywords =["education","تعليم","university","جامعة","degree","درجة"]
        in_education_section =False 
        current_edu ={}

        for line in lines :
            line_lower =line .lower ()


            if any (keyword in line_lower for keyword in education_keywords ):
                in_education_section =True 
                if current_edu :
                    result ["education"].append (current_edu )
                    current_edu ={}
                continue 

            if in_education_section :
                if line and not line .startswith ("-")and "university"in line_lower or "college"in line_lower :
                    if current_edu :
                        result ["education"].append (current_edu )
                    current_edu ={"institution":line ,"degree":"","duration":""}
                elif current_edu and "degree"in line_lower or "major"in line_lower :
                    if ":"in line :
                        current_edu ["degree"]=line .split (":",1 )[1 ].strip ()
                elif current_edu and any (word in line_lower for word in ["2020","2021","2022","2023","2024"]):
                    current_edu ["duration"]=line 

        if current_edu :
            result ["education"].append (current_edu )


        skills_keywords =["skills","مهارات","technologies","تكنولوجيا"]
        in_skills_section =False 

        for i, line in enumerate (lines ):
            line_lower =line .lower ()

            if any (keyword in line_lower for keyword in skills_keywords ):
                in_skills_section =True 
                continue 

            if in_skills_section :

                if line and any (section in line_lower for section in ["experience","projects","education","languages"]):
                    in_skills_section =False 
                    continue 

                if line and not line .startswith ("-") and not line .startswith ("•"):
                    skills =re .split (r'[,|;]',line )
                    for skill in skills :
                        skill_clean =skill .strip ()
                        if skill_clean and len (skill_clean )>1 :
                            result ["skills"].append (skill_clean )


        project_keywords =["projects","مشاريع","experience","خبرة","work"]
        in_project_section =False 
        current_exp ={}
        current_project = {}

        for line in lines :
            line_lower =line .lower ()

            if any (keyword in line_lower for keyword in project_keywords ):
                # start parsing projects section (or experience if labeled as such)
                in_project_section =True 
                # flush any pending experience
                if current_exp :
                    result ["experience"].append (current_exp )
                    current_exp ={}
                # reset current project
                current_project = {}
                continue 

            if in_project_section :
                # end section when next major header shows up
                if line and any (sec in line_lower for sec in ["education","skills","languages","certifications","experience"]):
                    in_project_section =False
                    if current_project :
                        result["projects"].append(current_project)
                        current_project = {}
                    continue

                # project entry lines usually start with '-' or '•' or are titles
                if line and (line.startswith("-") or line.startswith("•")):
                    # flush previous project if has title
                    if current_project and current_project.get("title"):
                        result["projects"].append(current_project)
                        current_project = {}

                    proj_line = line[1:].strip()
                    # try to split title and technologies using ' - ' or ' : '
                    if ' - ' in proj_line:
                        parts = proj_line.split(' - ', 1)
                        title = parts[0].strip()
                        desc = parts[1].strip()
                        current_project = {"title": title, "description": desc, "technologies": [], "achievements": []}
                    elif ':' in proj_line:
                        parts = proj_line.split(':', 1)
                        title = parts[0].strip()
                        desc = parts[1].strip()
                        current_project = {"title": title, "description": desc, "technologies": [], "achievements": []}
                    else:
                        current_project = {"title": proj_line, "description": "", "technologies": [], "achievements": []}

                elif current_project and (line.lower().startswith('tech') or 'technologies' in line_lower or 'tools' in line_lower):
                    # technologies line
                    if ':' in line:
                        tech_part = line.split(':', 1)[1].strip()
                    else:
                        tech_part = line.strip()
                    techs = re.split(r'[,|;]', tech_part)
                    current_project['technologies'].extend([t.strip() for t in techs if t.strip()])

                elif current_project and (line.startswith('-') or line.startswith('•')):
                    # bullet within project treated as achievement
                    ach = line[1:].strip()
                    if ach:
                        current_project.setdefault('achievements', []).append(ach)

                elif current_project and line and not line.startswith('-') and not line.startswith('•'):
                    # continuation of description
                    if current_project.get('description'):
                        current_project['description'] += ' ' + line
                    else:
                        current_project['description'] = line

        # flush any remaining project
        if current_project and current_project.get('title'):
            result['projects'].append(current_project)

        # flush any remaining experience
        if current_exp and current_exp.get('position'):
            result["experience"].append (current_exp )


        lang_keywords =["languages","لغات","language"]
        in_lang_section =False 

        for line in lines :
            line_lower =line .lower ()

            if any (keyword in line_lower for keyword in lang_keywords ):
                in_lang_section =True 
                continue 

            if in_lang_section :
                if ":"in line :
                    lang_part =line .split (":",1 )[1 ].strip ()
                    result ["languages"].append (lang_part )
                elif line and len (line )<50 :
                    result ["languages"].append (line )


        result ["skills"]=list (set ([s for s in result ["skills"]if len (s )>1 ]))

        return result 

    @staticmethod 
    def calculate_basic_ats_score (raw_text :str )->Dict [str ,Any ]:

        score =0 
        feedback =[]
        features ={}

        text_lower =raw_text .lower ()


        sections_found =[]

        if "experience"in text_lower or "projects"in text_lower or "خبرة"in text_lower :
            score +=20 
            feedback .append ("✅ Has experience/projects section")
            sections_found .append ("experience")
        else :
            feedback .append ("❌ Missing experience section")

        if "education"in text_lower or "تعليم"in text_lower or "university"in text_lower :
            score +=15 
            feedback .append ("✅ Has education section")
            sections_found .append ("education")
        else :
            feedback .append ("❌ Missing education section")

        if "skill"in text_lower or "مهارة"in text_lower or "html"in text_lower or "python"in text_lower :
            score +=10 
            feedback .append ("✅ Has skills section")
            sections_found .append ("skills")


            skill_count =text_lower .count (",")+text_lower .count ("|")
            features ["skills_count"]=max (1 ,skill_count )
        else :
            feedback .append ("❌ Missing skills section")


        if len (raw_text )>500 :
            score +=10 
            feedback .append ("✅ Has sufficient content")
            features ["content_length"]="good"
        else :
            feedback .append ("❌ Content too short")
            features ["content_length"]="short"


        email_pattern =r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        has_email =bool (re .search (email_pattern ,raw_text ))
        phone_pattern =r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        has_phone =bool (re .search (phone_pattern ,raw_text ))

        if has_email :
            score +=10 
            feedback .append ("✅ Has email address")
        else :
            feedback .append ("❌ Missing email address")

        if has_phone :
            score +=5 
            feedback .append ("✅ Has phone number")
        else :
            feedback .append ("❌ Missing phone number")


        quant_words =["%","percentage","improved","increased","reduced","saved","built","developed"]
        quant_count =sum (1 for word in quant_words if word in text_lower )

        if quant_count >0 :
            score +=15 
            feedback .append (f"✅ Has {quant_count } quantifiable achievements")
            features ["achievement_count"]=quant_count 
        else :
            feedback .append ("❌ Missing quantifiable achievements")


        tech_keywords =["react","python","javascript","django","mysql","docker","html","css"]
        tech_found =[tech for tech in tech_keywords if tech in text_lower ]

        if tech_found :
            score +=10 
            feedback .append (f"✅ Mentions technologies: {', '.join (tech_found [:3 ])}")
            features ["technologies"]=tech_found 
        else :
            feedback .append ("❌ Missing technology keywords")

        # Projects presence
        if "project" in text_lower or "projects" in text_lower or "مشاريع" in text_lower:
            score +=10
            feedback.append("✅ Has projects section")
            features["has_projects"] = True
        else:
            feedback.append("❌ Missing projects section")


        if score >=80 :
            feedback .append ("📊 Overall: Strong CV")
        elif score >=60 :
            feedback .append ("📊 Overall: Good CV, needs some improvements")
        else :
            feedback .append ("📊 Overall: Needs significant improvements")

        features .update ({
        "raw_text_length":len (raw_text ),
        "has_email":has_email ,
        "has_phone":has_phone ,
        "sections_found":sections_found 
        })

        return {
        "score":min (score ,100 ),
        "feedback":feedback ,
        "features":features 
        }
    @staticmethod 
    def parse_simple_cv (raw_text :str )->Dict [str ,Any ]:

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
        "languages":[],
        "projects":[]
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
            elif "skills:"in line_lower or "مهارات:"in line :
                if ":"in line :
                    skills_part =line .split (":",1 )[1 ].strip ()
                    if skills_part :
                        skills =[s .strip ()for s in skills_part .split (",")if s .strip ()]
                        result ["skills"].extend (skills )
                current_section ="skills"
                continue 
            elif "projects:"in line_lower or "مشاريع:"in line :
                if ":"in line :
                    proj_part = line.split(":",1)[1].strip()
                    if proj_part:
                        # split inline projects by ; or |
                        proj_items = re.split(r'[;|\n]', proj_part)
                        for p in proj_items:
                            p_clean = p.strip()
                            if p_clean:
                                # store minimal project entry
                                result["projects"].append({"title":p_clean, "description":"", "technologies":[], "achievements":[]})
                current_section ="projects"
                continue 
            elif "experience:"in line_lower or "خبرة:"in line :
                current_section ="experience"
                continue 
            elif "education:"in line_lower or "تعليم:"in line :
                if ":"in line :
                    edu_part =line .split (":",1 )[1 ].strip ()
                    if edu_part :
                        result ["education"].append ({"institution":edu_part ,"degree":"","duration":""})
                current_section ="education"
                continue 


            if current_section =="skills":
                if line and not any (kw in line_lower for kw in ["experience","education","languages","certifications"]):
                    skills =[s .strip ()for s in line .split (",")if s .strip ()]
                    result ["skills"].extend (skills )
                else :
                    current_section =None 
            elif current_section =="projects":
                if line and (line.startswith("-") or line.startswith("•")):
                    proj_line = line[1:].strip()
                    # try to split title and desc
                    if ' - ' in proj_line:
                        tparts = proj_line.split(' - ',1)
                        title = tparts[0].strip()
                        desc = tparts[1].strip()
                    elif ':' in proj_line:
                        tparts = proj_line.split(':',1)
                        title = tparts[0].strip()
                        desc = tparts[1].strip()
                    else:
                        title = proj_line
                        desc = ''
                    # extract inline technologies if present in the same bullet
                    desc_lower = desc.lower()
                    techs = []
                    if 'technologies' in desc_lower or 'tools' in desc_lower or 'tech:' in desc_lower:
                        # try to split by 'technologies' keyword
                        m = re.split(r'(technologies|tools|tech)[:\s-]*', desc, flags=re.IGNORECASE)
                        # m may be like [before, 'technologies', after]
                        if len(m) >= 3:
                            desc = m[0].strip()
                            tech_part = m[2].strip()
                            techs = [t.strip() for t in re.split(r'[,|;]', tech_part) if t.strip()]
                    result["projects"].append({"title":title, "description":desc, "technologies":techs, "achievements":[]})
                elif line and not line.startswith("-") and not line.startswith("•"):
                    # continuation/techs or description for last project
                    if result["projects"]:
                        last = result["projects"][-1]
                        if any(k in line_lower for k in ["tech","technologies","tools"]):
                            if ':' in line:
                                tech_part = line.split(':',1)[1].strip()
                            else:
                                tech_part = line
                            techs = re.split(r'[,|;]', tech_part)
                            last["technologies"].extend([t.strip() for t in techs if t.strip()])
                        else:
                            if last.get("description"):
                                last["description"] += ' ' + line
                            else:
                                last["description"] = line
                else:
                    current_section = None
            elif current_section =="experience":
                if line and (line .startswith ("-") or line .startswith ("•")):
                    line_content =line [1 :].strip ()
                    if " at "in line_content .lower ():
                        parts =line_content .split (" at ")
                        if result ["experience"] and not result ["experience"][-1 ].get ("position"):
                            result ["experience"][-1 ]["position"]=parts [0 ].strip ()
                            result ["experience"][-1 ]["company"]=parts [1 ].strip ()if len (parts )>1 else ""
                        else :
                            result ["experience"].append ({
                            "position":parts [0 ].strip (),
                            "company":parts [1 ].strip ()if len (parts )>1 else "",
                            "duration":"",
                            "description":"",
                            "achievements":[]
                            })
                    else :
                        if result ["experience"]:
                            result ["experience"][-1 ]["achievements"].append (line_content )
                        else :
                            result ["experience"].append ({
                            "position":"",
                            "company":"",
                            "duration":"",
                            "description":line_content ,
                            "achievements":[]
                            })
                elif line and not line .startswith ("-") and not line .startswith ("•"):
                    if any (kw in line_lower for kw in ["experience","education","languages","certifications","skills"]):
                        current_section =None 
                    elif " at "in line_lower :
                        parts =line .split (" at ")
                        result ["experience"].append ({
                        "position":parts [0 ].strip (),
                        "company":parts [1 ].strip ()if len (parts )>1 else "",
                        "duration":"",
                        "description":"",
                        "achievements":[]
                        })
                    else :
                        result ["experience"].append ({
                        "position":line ,
                        "company":"",
                        "duration":"",
                        "description":"",
                        "achievements":[]
                        })
            elif current_section =="education":
                if line and not any (kw in line_lower for kw in ["experience","skills","languages","certifications"]):
                    if result ["education"]:
                        if "degree"in line_lower or "major"in line_lower :
                            result ["education"][-1 ]["degree"]=line 
                        else :
                            result ["education"][-1 ]["duration"]=line 
                    else :
                        result ["education"].append ({"institution":line ,"degree":"","duration":""})
                else :
                    current_section =None 

        return result 