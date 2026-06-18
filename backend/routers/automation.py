from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database
import automation
from auth import get_current_user

router = APIRouter(
    prefix="/admin/automation",
    tags=["Automation"],
)

@router.get("/logs", response_model=List[str])
def get_automation_logs(current_user = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return automation.get_recent_logs()

@router.post("/trigger")
def trigger_automation(db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    automation.run_all_automation(db)
    return {"status": "success", "message": "Automation cycle triggered manually."}
