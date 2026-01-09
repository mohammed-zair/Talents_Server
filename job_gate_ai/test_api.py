
import requests 
import json 

BASE_URL ="http://localhost:8000"

def test_health ():
    response =requests .get (f"{BASE_URL }/health")
    print ("Health Check:",response .status_code ,response .json ())
    return response .status_code ==200 

def test_cv_analysis_text ():
    cv_text ="""
    John Doe
    Email: john@example.com
    Phone: +1-555-123-4567
    
    Experience:
    - Software Engineer at Tech Corp (2020-2023)
    • Developed web applications using Python and React
    • Improved performance by 40%
    
    Skills: Python, JavaScript, React, SQL
    Education: BS Computer Science, University of Example (2016-2020)
    """

    payload ={
    "user_id":"test_user_123",
    "cv_text":cv_text ,
    "use_ai":False 
    }

    response =requests .post (
    f"{BASE_URL }/cv/analyze-text",
    json =payload 
    )

    print ("CV Text Analysis:",response .status_code )
    if response .status_code ==200 :
        data =response .json ()
        print (f"Success: {data .get ('success')}")
        print (f"ATS Score: {data .get ('ats_score')}")
        print (f"Features: {json .dumps (data .get ('features',{}),indent =2 )}")
    else :
        print (f"Error: {response .text }")

    return response .status_code ==200 

def test_endpoints ():

    endpoints =[
    "/",
    "/health",
    "/cv/status",
    "/test/health"
    ]

    for endpoint in endpoints :
        try :
            response =requests .get (f"{BASE_URL }{endpoint }",timeout =5 )
            print (f"✅ {endpoint }: {response .status_code }")
        except Exception as e :
            print (f"❌ {endpoint }: {e }")

if __name__ =="__main__":
    print ("🚀 Testing JobGate AI API...")


    import time 
    time .sleep (3 )

    try :

        test_endpoints ()


        if test_health ():
            print ("\n✅ Health check passed")


            print ("\n📄 Testing CV analysis...")
            if test_cv_analysis_text ():
                print ("✅ CV analysis test passed")
            else :
                print ("❌ CV analysis test failed")
        else :
            print ("❌ Health check failed")

    except Exception as e :
        print (f"❌ Test failed: {e }")