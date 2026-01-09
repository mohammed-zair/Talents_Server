import sys
sys.path.insert(0, r'c:\Users\M S I\Desktop\job_gate_ai')

try:
    print("Importing FastAPI...")
    from fastapi import FastAPI
    print("OK")
    
    print("Importing app.main...")
    from app.main import app
    print("OK")
    
    print("App created successfully!")
    print(f"Routes: {len(app.routes)}")
    
    # List all routes
    for route in app.routes:
        print(f"  - {route.path} ({route.methods if hasattr(route, 'methods') else 'N/A'})")
    
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
