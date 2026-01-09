from fastapi import APIRouter 

router =APIRouter (prefix ="/export",tags =["Export"])

@router .get ("/health")
async def export_health ():
    return {"status":"Export service healthy - Phase 2 implementation"}
