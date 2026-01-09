import os
import uvicorn 
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)

from app .core .config import settings 

if __name__ =="__main__":
    uvicorn .run (
    "app.main:app",
    host ="0.0.0.0",
    port =settings .api_port ,
    reload =settings .debug ,
    log_level ="info"
    )