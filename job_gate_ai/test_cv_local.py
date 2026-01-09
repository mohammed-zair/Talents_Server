import sys
sys.path.insert(0, '/c/Users/M S I/Desktop/job_gate_ai')

cv_text = """
John Doe
Email: john@example.com
Phone: +1-555-123-4567

Experience:
- Software Engineer at Tech Corp (2020-2023)
- Developed web applications using Python and React
- Improved performance by 40%

Skills: Python, JavaScript, React, SQL
Education: BS Computer Science, University of Example (2016-2020)
"""

try:
    from app.services.fallback_service import FallbackCVProcessor
    from app.services.ats_scorer import ATSScorer
    
    print("Testing FallbackCVProcessor...")
    result = FallbackCVProcessor.structure_cv_fallback(cv_text)
    print(f"✅ Fallback result keys: {result.keys()}")
    print(f"   Personal info: {result.get('personal_info')}")
    print(f"   Experience: {len(result.get('experience', []))} items")
    print(f"   Skills: {result.get('skills')}")
    
    print("\nTesting ATSScorer...")
    scorer = ATSScorer()
    ats_result = scorer.calculate_score(result)
    print(f"✅ ATS score: {ats_result.get('score')}")
    print(f"   Feedback: {ats_result.get('feedback')}")
    
except Exception as e:
    import traceback
    print(f"❌ Error: {e}")
    traceback.print_exc()
