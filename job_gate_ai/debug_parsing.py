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
print("📄 Raw lines parsed:")
for i, line in enumerate(lines):
    print(f"  {i}: {line}")

print("\n🔍 Looking for 'Experience:' keyword...")
for i, line in enumerate(lines):
    if "experience" in line.lower():
        print(f"  Found at line {i}: {line}")

print("\n🔍 Looking for skill lines starting with '-'...")
for i, line in enumerate(lines):
    if line.startswith("-"):
        print(f"  Found at line {i}: {line}")
