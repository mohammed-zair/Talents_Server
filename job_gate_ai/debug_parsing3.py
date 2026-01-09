import sys
sys.path.insert(0, '/c/Users/M S I/Desktop/job_gate_ai')

cv_text = """John Doe
Email: john@example.com
Phone: +1-555-123-4567

Experience:
- Software Engineer at Tech Corp (2020-2023)
- Developed web applications using Python and React
- Improved performance by 40%

Skills: Python, JavaScript, React, SQL
Education: BS Computer Science, University of Example (2016-2020)"""

lines = [line.strip() for line in cv_text.split('\n') if line.strip()]
current_section = None

for i, line in enumerate(lines):
    line_lower = line.lower()
    print(f"Line {i}: section={current_section}, starts_with_dash={line.startswith('-')}, line='{line}'")
    
    if "experience:" in line_lower:
        current_section = "experience"
        print(f"  -> Setting section to 'experience'")
    elif "skills:" in line_lower:
        current_section = "skills"
        print(f"  -> Setting section to 'skills'")
    elif current_section == "experience":
        if line and not line.startswith("-"):
            print(f"  -> Would add as experience")
        elif line and line.startswith("-"):
            print(f"  -> Skipped (starts with dash)")
