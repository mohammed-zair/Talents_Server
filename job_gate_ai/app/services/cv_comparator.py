
class CVComparator :
    def compare_cv_to_job (self ,cv_data ,job_description ):


        cv_skills =set (cv_data .get ("skills",[]))


        job_skills =self .extract_skills_from_jd (job_description )


        matched_skills =cv_skills .intersection (job_skills )
        missing_skills =job_skills -cv_skills 

        return {
        "match_percentage":len (matched_skills )/len (job_skills )*100 if job_skills else 0 ,
        "matched_skills":list (matched_skills ),
        "missing_skills":list (missing_skills ),
        "recommendations":self .generate_recommendations (missing_skills )
        }

    def extract_skills_from_jd (self ,job_description ):

        pass 