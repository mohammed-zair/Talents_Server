import subprocess
import time
import sys

# Start uvicorn server
proc = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=r'c:\Users\M S I\Desktop\job_gate_ai'
)

# Read output for 5 seconds
time.sleep(5)

# Check if process is still running
if proc.poll() is None:
    print("Server is running!")
    proc.terminate()
else:
    print(f"Server exited with code: {proc.returncode}")
    stdout, stderr = proc.communicate()
    print("\nSTDOUT:")
    print(stdout)
    print("\nSTDERR:")
    print(stderr)
