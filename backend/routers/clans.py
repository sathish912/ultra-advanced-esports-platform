from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

import models, schemas, database, auth

router = APIRouter(prefix="/clans", tags=["Advanced Clan & Guild System"])

@router.post("/", response_model=schemas.Clan)
def create_clan(
    clan: schemas.ClanCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Create a new Clan and become its Leader"""
    # Check if user already in a clan
    existing = db.query(models.ClanMember).filter(models.ClanMember.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already in a clan.")
        
    db_clan = models.Clan(**clan.model_dump(), leader_id=current_user.id)
    db.add(db_clan)
    db.commit()
    db.refresh(db_clan)
    
    # Add leader to clan_members
    member = models.ClanMember(
        clan_id=db_clan.id,
        user_id=current_user.id,
        role="Leader"
    )
    db.add(member)
    db.commit()
    
    return db_clan

@router.get("/", response_model=List[schemas.Clan])
def get_clans(db: Session = Depends(database.get_db)):
    """List all clans"""
    return db.query(models.Clan).order_by(models.Clan.xp.desc()).all()

@router.post("/{clan_id}/join")
def join_clan(
    clan_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Send a request to join a recruiting Clan"""
    clan = db.query(models.Clan).filter(models.Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")
        
    if not clan.is_recruiting:
        raise HTTPException(status_code=400, detail="Clan is not currently recruiting")
        
    existing_member = db.query(models.ClanMember).filter(models.ClanMember.user_id == current_user.id).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="You are already in a clan.")
        
    existing_req = db.query(models.ClanJoinRequest).filter(
        models.ClanJoinRequest.clan_id == clan_id,
        models.ClanJoinRequest.user_id == current_user.id,
        models.ClanJoinRequest.status == "Pending"
    ).first()
    if existing_req:
        raise HTTPException(status_code=400, detail="Join request already pending.")
        
    req = models.ClanJoinRequest(clan_id=clan_id, user_id=current_user.id)
    db.add(req)
    db.commit()
    return {"detail": "Join request sent successfully"}

@router.get("/{clan_id}/requests", response_model=List[schemas.ClanJoinRequestWithUser])
def get_clan_requests(
    clan_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Leader/Co-Leader: Get pending join requests for a clan"""
    member = db.query(models.ClanMember).filter(
        models.ClanMember.clan_id == clan_id,
        models.ClanMember.user_id == current_user.id
    ).first()
    if not member or member.role not in ["Leader", "Co-Leader"]:
        raise HTTPException(status_code=403, detail="Not authorized to view requests")
        
    requests = db.query(models.ClanJoinRequest).filter(
        models.ClanJoinRequest.clan_id == clan_id,
        models.ClanJoinRequest.status == "Pending"
    ).all()
    
    return requests

@router.post("/requests/{req_id}/reject")
def reject_join_request(
    req_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Leader/Co-Leader: Reject a pending join request"""
    req = db.query(models.ClanJoinRequest).filter(models.ClanJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
        
    # Check permissions
    member = db.query(models.ClanMember).filter(
        models.ClanMember.clan_id == req.clan_id,
        models.ClanMember.user_id == current_user.id
    ).first()
    if not member or member.role not in ["Leader", "Co-Leader"]:
        raise HTTPException(status_code=403, detail="Not authorized to reject members")
        
    req.status = "Rejected"
    db.commit()
    return {"detail": "Request rejected successfully"}


@router.post("/requests/{req_id}/accept")
def accept_join_request(
    req_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Leader/Co-Leader: Accept a pending join request"""
    req = db.query(models.ClanJoinRequest).filter(models.ClanJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
        
    # Check permissions
    member = db.query(models.ClanMember).filter(
        models.ClanMember.clan_id == req.clan_id,
        models.ClanMember.user_id == current_user.id
    ).first()
    if not member or member.role not in ["Leader", "Co-Leader"]:
        raise HTTPException(status_code=403, detail="Not authorized to accept members")
        
    req.status = "Approved"
    
    # Add to members
    new_member = models.ClanMember(
        clan_id=req.clan_id,
        user_id=req.user_id,
        role="Member"
    )
    db.add(new_member)
    db.commit()
    return {"detail": "Member accepted into the Clan"}

@router.get("/leaderboard")
def get_clan_leaderboard(db: Session = Depends(database.get_db)):
    """Get Top Clans globally sorted by XP"""
    clans = db.query(models.Clan).order_by(models.Clan.xp.desc()).limit(100).all()
    return [{
        "rank": idx + 1,
        "name": c.name,
        "tag": c.tag,
        "level": c.level,
        "xp": c.xp
    } for idx, c in enumerate(clans)]

@router.post("/{clan_id}/ban", response_model=schemas.Clan)
def ban_clan(
    clan_id: int,
    req: schemas.ClanBanRequest,
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(auth.get_current_admin_user)
):
    """Ban a clan (Admin only)"""
    clan = db.query(models.Clan).filter(models.Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")
        
    clan.is_banned = True
    clan.ban_reason = req.reason
    db.commit()
    db.refresh(clan)
    return clan

@router.get("/{clan_id}/members", response_model=List[schemas.ClanMemberWithUser])
def get_clan_members(clan_id: int, db: Session = Depends(database.get_db)):
    """Get members of a clan"""
    members = db.query(models.ClanMember).filter(models.ClanMember.clan_id == clan_id).all()
    if not members:
        # Might just be empty if clan has no members (should at least have leader)
        return []
    return members

