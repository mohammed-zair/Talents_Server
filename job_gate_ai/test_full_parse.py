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

cv_text_with_projects = """Jane Doe
Email: jane@example.com
Phone: +1-555-987-6543

Projects:
- Weather App - Built a weather forecasting app using Python and Flask - Technologies: Python, Flask, OpenWeatherMap API
- Resume Parser - Developed a resume parsing tool; improved extraction by 30% - Technologies: Python, regex, FastAPI

Experience:
- Software Engineer at ExampleCo (2019-2024)
- Led migration to microservices

Skills: Python, FastAPI, Docker
Education: MS Computer Science, Example University (2017-2019)"""

result = FallbackCVProcessor.structure_cv_fallback(cv_text_with_projects)
print("Full Structured CV:")
print(f"Personal Info: {result['personal_info']}")
print(f"\nProjects ({len(result.get('projects', []))}):")
for i, p in enumerate(result.get('projects', [])):
    print(f"  {i}: Title={p.get('title')}, Technologies={p.get('technologies')}")

print(f"\nExperience ({len(result['experience'])} items):")
for i, exp in enumerate(result['experience']):
    print(f"  {i}: Position={exp.get('position')}, Company={exp.get('company')}")
    print(f"     Achievements: {exp.get('achievements')}")

print(f"\nSkills: {result['skills']}")
print(f"\nEducation: {result['education']}")
