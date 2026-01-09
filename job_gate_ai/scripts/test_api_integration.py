import subprocess
import time
import sys
import requests
import json

# Start uvicorn server in background
print("Starting uvicorn server...")
proc = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=r'c:\Users\M S I\Desktop\job_gate_ai'
)

# Wait for server to start
time.sleep(6)

try:
    # Test 1: Health check
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    r = requests.get('http://127.0.0.1:8000/health')
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    
    # Test 2: CV Analysis (text)
    print("\n" + "="*60)
    print("TEST 2: CV Analysis (Text)")
    print("="*60)
    cv_text = """Jane Doe
Email: jane@example.com
Phone: +1-555-987-6543

Projects:
- Weather App - Built a weather forecasting app using Python and Flask
- Resume Parser - Developed a resume parsing tool; improved extraction by 30%

Experience:
- Software Engineer at ExampleCo (2019-2024)
- Led migration to microservices

Skills: Python, FastAPI, Docker
Education: MS Computer Science, Example University (2017-2019)"""

    r = requests.post('http://127.0.0.1:8000/cv/analyze-text', data={
        'user_id': 'test_user',
        'cv_text': cv_text,
        'use_ai': 'false'
    })
    print(f"Status: {r.status_code}")
    resp = r.json()
    print(f"Success: {resp.get('success')}")
    print(f"ATS Score: {resp.get('ats_score')}")
    print(f"Projects Count: {len(resp.get('structured_data', {}).get('projects', []))}")
    print(f"Skills: {resp.get('structured_data', {}).get('skills', [])}")
    
    # Test 3: Chatbot Start
    print("\n" + "="*60)
    print("TEST 3: Chatbot Start Session")
    print("="*60)
    r = requests.post('http://127.0.0.1:8000/chatbot/start', json={
        'user_id': 'test_user',
        'language': 'english'
    })
    print(f"Status: {r.status_code}")
    resp = r.json()
    session_id = resp.get('session_id')
    print(f"Session ID: {session_id}")
    print(f"Initial Message: {resp.get('message')}")
    print(f"Current Step: {resp.get('session', {}).get('current_step')}")
    
    # Test 4: Chatbot Chat
    print("\n" + "="*60)
    print("TEST 4: Chatbot Chat")
    print("="*60)
    r = requests.post('http://127.0.0.1:8000/chatbot/chat', json={
        'session_id': session_id,
        'message': 'Hi, I want to build a CV. My name is Ali Ahmed and my email is ali.ahmed@mail.com'
    })
    print(f"Status: {r.status_code}")
    resp = r.json()
    print(f"Response: {resp.get('message')}")
    print(f"CV Data Summary: {resp.get('cv_data_summary')}")
    print(f"Current Step: {resp.get('current_step')}")
    
    # Test 5: Chatbot Chat - Skills
    print("\n" + "="*60)
    print("TEST 5: Chatbot Chat - Add Skills")
    print("="*60)
    r = requests.post('http://127.0.0.1:8000/chatbot/chat', json={
        'session_id': session_id,
        'message': 'My skills are Python, JavaScript, React, and Docker'
    })
    print(f"Status: {r.status_code}")
    resp = r.json()
    print(f"Response: {resp.get('message')}")
    print(f"Skills Count: {resp.get('cv_data_summary', {}).get('skills_count')}")
    
    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60)

finally:
    # Stop server
    print("\nShutting down server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
