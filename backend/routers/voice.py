from fastapi import APIRouter, Depends, HTTPException
import models
import auth
from agora_token_builder import RtcTokenBuilder
import time

router = APIRouter(prefix="/voice", tags=["Voice"])

APP_ID = "bda157fb812943fa83c5f1d74c6a69da"
APP_CERTIFICATE = "fa72a84e68dd426da6183d7b0902a4d1"

@router.get("/token")
def get_voice_token(
    channelName: str,
    current_user: models.User = Depends(auth.get_current_user)
):
    if not APP_ID or not APP_CERTIFICATE:
        raise HTTPException(status_code=500, detail="Agora keys not configured")
        
    uid = current_user.id
    expiration_time_in_seconds = 3600 # 1 hour
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time_in_seconds

    # role 1 is publisher (can speak), 2 is subscriber (listen only)
    role = 1

    token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID, 
        APP_CERTIFICATE, 
        channelName, 
        uid, 
        role, 
        privilege_expired_ts
    )
    
    return {
        "token": token,
        "uid": uid,
        "appId": APP_ID,
        "channelName": channelName
    }
