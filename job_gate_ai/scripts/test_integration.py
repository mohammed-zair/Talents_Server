import sys
sys.path.insert(0, r'c:\Users\M S I\Desktop\job_gate_ai')
from app.services.fallback_service import FallbackCVProcessor
from app.services.ats_scorer import ATSScorer
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

structured = FallbackCVProcessor.structure_cv_fallback(cv_text)
scorer = ATSScorer()
result = scorer.calculate_score(structured)
features = scorer.extract_cv_features(structured)
features.update(result.get('features', {}))

out = {
    'structured': structured,
    'score': result.get('score'),
    'feedback': result.get('feedback'),
    'features': features
}

print(json.dumps(out, indent=2, ensure_ascii=False))
