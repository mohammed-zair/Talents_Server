
import os 
from contextlib import contextmanager 
from datetime import datetime ,timedelta 
from typing import Dict ,List ,Optional 
from sqlalchemy import create_engine ,text 
from sqlalchemy .orm import sessionmaker ,scoped_session 
from sqlalchemy .exc import SQLAlchemyError ,IntegrityError 
from app .models .database_models import Base ,User ,CVAnalysis ,BuilderSession ,ChatbotSession 

class DatabaseService :
    def __init__ (self ,database_url =None ):
        self .database_url =database_url or os .getenv ("DATABASE_URL","sqlite:///./jobgate.db")
        self .engine =create_engine (
        self .database_url ,
        pool_pre_ping =True ,
        echo =os .getenv ("SQL_ECHO","False").lower ()=="true"
        )
        self .SessionLocal =sessionmaker (
        autocommit =False ,
        autoflush =False ,
        expire_on_commit =False ,
        bind =self .engine 
        )


        Base .metadata .create_all (bind =self .engine )


        self ._test_connection ()

    def _test_connection (self ):
        try :
            with self .engine .connect ()as conn :
                conn .execute (text ("SELECT 1"))
            print ("✅ Database connection successful")
        except Exception as e :
            print (f"❌ Database connection failed: {e }")
            raise 

    @contextmanager 
    def get_session (self ):
        session =self .SessionLocal ()
        try :
            yield session 
            session .commit ()
        except Exception :
            session .rollback ()
            raise 
        finally :
            session .close ()


    def get_or_create_user (self ,user_id :str ,email :str =None )->Optional [User ]:
        with self .get_session ()as session :
            user =session .query (User ).filter_by (user_id =user_id ).first ()
            if not user :
                user =User (user_id =user_id ,email =email )
                session .add (user )
                session .flush ()
            return user 


    def save_cv_analysis (self ,analysis_data :Dict )->Optional [CVAnalysis ]:
        try :
            with self .get_session ()as session :

                user =self .get_or_create_user (analysis_data ["user_id"])
                if not user :
                    print ("❌ Failed to get or create user")
                    return None 


                if "file_hash"in analysis_data and analysis_data ["file_hash"]:
                    existing =session .query (CVAnalysis ).filter_by (
                    user_id =user .id ,
                    file_hash =analysis_data ["file_hash"]
                    ).first ()

                    if existing :
                        print (f"CV analysis already exists: {existing .id }")
                        return existing 


                cv_analysis =CVAnalysis (
                user_id =user .id ,
                file_name =analysis_data .get ("file_name","unknown"),
                file_hash =analysis_data .get ("file_hash"),
                structured_data =analysis_data .get ("structured_data",{}),
                ats_score =analysis_data .get ("ats_score",0.0 ),
                features =analysis_data .get ("features",{}),
                analysis_method =analysis_data .get ("analysis_method","fallback"),
                processing_time =analysis_data .get ("processing_time",0.0 ),
                file_path =analysis_data .get ("file_path")
                )

                session .add (cv_analysis )
                session .flush ()
                print (f"✅ Saved CV analysis: {cv_analysis .id }")
                return cv_analysis 

        except IntegrityError as e :
            print (f"Integrity error saving CV analysis: {e }")
            return None 
        except Exception as e :
            print (f"Error saving CV analysis: {e }")
            return None 

    def get_user_cv_analyses (self ,user_id :str ,limit :int =50 )->List [Dict ]:
        try :
            with self .get_session ()as session :
                user =session .query (User ).filter_by (user_id =user_id ).first ()
                if not user :
                    return []

                analyses =session .query (CVAnalysis ).filter_by (user_id =user .id ).order_by (CVAnalysis .created_at .desc ()).limit (limit ).all ()

                return [analysis .to_dict ()for analysis in analyses ]
        except Exception as e :
            print (f"Error getting user CV analyses: {e }")
            return []


    def create_builder_session (self ,user_id :str ,session_data :Dict )->Optional [BuilderSession ]:
        try :
            with self .get_session ()as session :
                user =self .get_or_create_user (user_id )
                if not user :
                    return None 


                existing =session .query (BuilderSession ).filter_by (session_id =session_data ["session_id"]).first ()

                if existing :
                    return existing 

                builder_session =BuilderSession (
                session_id =session_data ["session_id"],
                user_id =user .id ,
                current_cv =session_data .get ("current_cv",{}),
                conversation_history =session_data .get ("conversation_history",[]),
                current_state =session_data .get ("current_state","start"),
                is_active =session_data .get ("is_active",1 ),
                is_complete =session_data .get ("is_complete",0 )
                )

                session .add (builder_session )
                session .flush ()
                print (f"✅ Created builder session: {builder_session .session_id }")
                return builder_session 

        except Exception as e :
            print (f"Error creating builder session: {e }")
            return None 

    def get_builder_session (self ,session_id :str )->Optional [BuilderSession ]:
        try :
            with self .get_session ()as session :
                return session .query (BuilderSession ).filter_by (session_id =session_id ).first ()
        except Exception as e :
            print (f"Error getting builder session: {e }")
            return None 

    def update_builder_session (self ,session_id :str ,updates :Dict )->bool :
        try :
            with self .get_session ()as session :
                builder_session =session .query (BuilderSession ).filter_by (session_id =session_id ).first ()

                if not builder_session :
                    return False 


                for key ,value in updates .items ():
                    if hasattr (builder_session ,key ):
                        setattr (builder_session ,key ,value )

                builder_session .last_activity =datetime .utcnow ()
                session .flush ()
                print (f"✅ Updated builder session: {session_id }")
                return True 

        except Exception as e :
            print (f"Error updating builder session: {e }")
            return False 

    def cleanup_old_sessions (self ,days_old :int =7 )->int :
        try :
            with self .get_session ()as session :
                cutoff_date =datetime .utcnow ()-timedelta (days =days_old )

                result =session .query (BuilderSession ).filter (
                BuilderSession .last_activity <cutoff_date ,
                BuilderSession .is_complete ==1 
                ).delete ()

                session .commit ()
                print (f"✅ Cleaned up {result } old sessions")
                return result 
        except Exception as e :
            print (f"Error cleaning up sessions: {e }")
            return 0 

    def create_chatbot_session (self ,session_data :Dict )->Optional [ChatbotSession ]:
        try :
            with self .get_session ()as session :
                existing =session .query (ChatbotSession ).filter_by (session_id =session_data ["session_id"]).first ()
                if existing :
                    return existing 

                record =ChatbotSession (
                session_id =session_data ["session_id"],
                user_id =session_data ["user_id"],
                language =session_data .get ("language","english"),
                output_language =session_data .get ("output_language",session_data .get ("language","english")),
                current_step =session_data .get ("current_step","personal_info"),
                cv_data =session_data .get ("cv_data",{}),
                conversation =session_data .get ("conversation",[]),
                job_requirements =session_data .get ("job_requirements"),
                job_posting_meta =session_data .get ("job_posting_meta",{}),
                score_data =session_data .get ("score_data",{}),
                final_summary =session_data .get ("final_summary"),
                is_complete =1 if session_data .get ("is_complete") else 0 
                )

                session .add (record )
                session .flush ()
                return record 
        except Exception as e :
            print (f"Error creating chatbot session: {e }")
            return None 

    def get_chatbot_session (self ,session_id :str )->Optional [ChatbotSession ]:
        try :
            with self .get_session ()as session :
                return session .query (ChatbotSession ).filter_by (session_id =session_id ).first ()
        except Exception as e :
            print (f"Error getting chatbot session: {e }")
            return None 

    def list_chatbot_sessions (self ,user_id :str ,limit :int =50 )->List [ChatbotSession ]:
        try :
            with self .get_session ()as session :
                return (
                session .query (ChatbotSession )
                .filter_by (user_id =user_id )
                .order_by (ChatbotSession .updated_at .desc ())
                .limit (limit )
                .all ()
                )
        except Exception as e :
            print (f"Error listing chatbot sessions: {e }")
            return []

    def update_chatbot_session (self ,session_id :str ,updates :Dict )->bool :
        try :
            with self .get_session ()as session :
                record =session .query (ChatbotSession ).filter_by (session_id =session_id ).first ()
                if not record :
                    return False 

                for key ,value in updates .items ():
                    if hasattr (record ,key ):
                        setattr (record ,key ,value )

                record .updated_at =datetime .utcnow ()
                session .flush ()
                return True 
        except Exception as e :
            print (f"Error updating chatbot session: {e }")
            return False 
