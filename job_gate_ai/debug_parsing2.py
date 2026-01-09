import sys
sys.path.insert(0, '/c/Users/M S I/Desktop/job_gate_ai')

from app.services.fallback_service import FallbackCVProcessor

cv_text = """John Doe
Email: john@example.com
Phone: +1-555-123-4567

Experience:
- Software Engineer at Tech Corp (2020-2023)
- Developed web applications using Python and React
- Improved performance by 40%

Skills: Python, JavaScript, React, SQL
Education: BS Computer Science, University of Example (2016-2020)"""

print("Testing parse_simple_cv...")
simple = FallbackCVProcessor.parse_simple_cv(cv_text)
print(f"Has email: {simple['personal_info']['email']}")
print(f"Experience: {len(simple['experience'])} items")
print(f"Skills: {simple['skills']}")

print("\nTesting _structure_complex_cv...")
complex_res = FallbackCVProcessor._structure_complex_cv(cv_text)
print(f"Experience: {len(complex_res['experience'])} items")
if complex_res['experience']:
    print(f"  First exp: {complex_res['experience'][0]}")
print(f"Skills: {complex_res['skills']}")
