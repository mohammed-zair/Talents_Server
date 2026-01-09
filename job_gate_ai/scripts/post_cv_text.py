import requests
import json

cv_text = """Jane Doe
Email: jane@example.com
Phone: +1-555-987-6543

Projects:
- Weather App - Built a weather forecasting app using Python and Flask - Technologies: Python, Flask, OpenWeatherMap API
- Resume Parser - Developed a resume parsing tool; improved extraction by 30% - Technologies: Python, regex, FastAPI

Experience:
- Software Engineer at ExampleCo (2019-2024)
- Led migration to microservices

Skills: Python, FastAPI, Docker
Education: MS Computer Science, Example University (2017-2019)
"""

url = "http://127.0.0.1:8000/cv/analyze-text"
payload = {
    'user_id': 'integration_test',
    'cv_text': cv_text,
    'use_ai': 'false'
}

r = requests.post(url, data=payload)
print('Status:', r.status_code)
try:
    print(json.dumps(r.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print('Response text:', r.text)
