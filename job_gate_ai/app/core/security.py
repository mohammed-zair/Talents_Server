import os 
from fastapi import HTTPException ,Security 
from fastapi .security import APIKeyHeader ,APIKeyQuery ,HTTPBearer ,HTTPAuthorizationCredentials 
import jwt 

api_key_header =APIKeyHeader (name ="X-API-Key",auto_error =False )
api_key_query =APIKeyQuery (name ="api_key",auto_error =False )
bearer_scheme =HTTPBearer (auto_error =False )

async def get_api_key (
api_key_header :str =Security (api_key_header ),
api_key_query :str =Security (api_key_query ),
):
    if api_key_header :
        return api_key_header 
    if api_key_query :
        return api_key_query 
    return None 

async def verify_api_key (api_key :str ):
    if not api_key :

        raise HTTPException (
        status_code =401 ,
        detail ="API Key required"
        )

    valid_keys =os .getenv ("API_KEYS","test-key-123").split (",")
    if api_key in valid_keys :
        return True 

    raise HTTPException (
    status_code =401 ,
    detail ="Invalid API Key"
    )

async def verify_internal_jwt (
credentials :HTTPAuthorizationCredentials 
):
    if not credentials or not credentials .credentials :
        raise HTTPException (
        status_code =401 ,
        detail ="JWT required"
        )

    secret =os .getenv ("AI_CORE_JWT_SECRET","" )
    if not secret :
        raise HTTPException (
        status_code =401 ,
        detail ="JWT secret not configured"
        )

    issuer =os .getenv ("AI_CORE_JWT_ISSUER","jobgate-backend" )
    audience =os .getenv ("AI_CORE_JWT_AUDIENCE","jobgate-ai-core" )
    token =credentials .credentials
    try :
        jwt .decode (
        token ,
        secret ,
        algorithms =["HS256"],
        issuer =issuer ,
        audience =audience ,
        options ={ "require" :["exp","iat","iss","aud"]}
        )
        return True
    except Exception :
        raise HTTPException (
        status_code =401 ,
        detail ="Invalid JWT"
        )

async def verify_ai_auth (
credentials :HTTPAuthorizationCredentials =Security (bearer_scheme ),
api_key :str =Security (get_api_key ),
):
    mode =(os .getenv ("AI_CORE_AUTH_MODE","apikey" )).lower ()
    if mode =="jwt" :
        return await verify_internal_jwt (credentials )
    if mode =="both" :
        try :
            return await verify_internal_jwt (credentials )
        except HTTPException :
            return await verify_api_key (api_key )
    return await verify_api_key (api_key )