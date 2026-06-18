from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

import models, schemas, database, auth

router = APIRouter(prefix="/lobby", tags=["Lobby & Squads"])

@router.post("/teams", response_model=schemas.Team)
def create_team(
    team: schemas.TeamCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Create a new team/squad"""
    existing_team = db.query(models.Team).filter(
        models.Team.captain_id == current_user.id
    ).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="You are already leading a team.")

    new_team = models.Team(
        name=team.name,
        captain_id=current_user.id,
        tournament_id=team.tournament_id,
        is_recruiting=team.is_recruiting,
        max_members=team.max_members
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    # Add captain as member
    member = models.TeamMember(team_id=new_team.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    
    return new_team

@router.get("/teams", response_model=List[schemas.Team])
def get_public_teams(
    db: Session = Depends(database.get_db)
):
    """List teams that are actively recruiting"""
    return db.query(models.Team).filter(models.Team.is_recruiting == True).all()

@router.get("/admin/teams", response_model=List[schemas.Team])
def admin_get_all_teams(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """List all teams for admin dashboard"""
    return db.query(models.Team).all()

@router.get("/my-team", response_model=schemas.Team)
def get_my_team(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get the team the current user is a part of"""
    member = db.query(models.TeamMember).filter(models.TeamMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="You are not in any team.")
    return member.team

@router.post("/teams/{team_id}/request-join")
def request_join_team(
    team_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """User requests to join a team"""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    member_count = db.query(models.TeamMember).filter(models.TeamMember.team_id == team_id).count()
    if member_count >= team.max_members:
        raise HTTPException(status_code=400, detail="Team is full")

    existing = db.query(models.TeamJoinRequest).filter(
        models.TeamJoinRequest.team_id == team_id,
        models.TeamJoinRequest.user_id == current_user.id,
        models.TeamJoinRequest.status == "Pending"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Request already pending")

    req = models.TeamJoinRequest(team_id=team_id, user_id=current_user.id)
    db.add(req)
    db.commit()
    return {"detail": "Join request sent"}

@router.get("/my-team/requests", response_model=List[schemas.TeamJoinRequest])
def get_team_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Captain views pending requests"""
    team = db.query(models.Team).filter(models.Team.captain_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=403, detail="You are not a team captain")
        
    return db.query(models.TeamJoinRequest).filter(
        models.TeamJoinRequest.team_id == team.id,
        models.TeamJoinRequest.status == "Pending"
    ).all()

@router.post("/requests/{req_id}/accept")
def accept_join_request(
    req_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.TeamJoinRequest).filter(models.TeamJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    team = db.query(models.Team).filter(models.Team.id == req.team_id).first()
    if team.captain_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    member_count = db.query(models.TeamMember).filter(models.TeamMember.team_id == team.id).count()
    if member_count >= team.max_members:
        raise HTTPException(status_code=400, detail="Team is full")

    req.status = "Approved"
    member = models.TeamMember(team_id=team.id, user_id=req.user_id)
    db.add(member)
    
    if member_count + 1 >= team.max_members:
        team.is_recruiting = False
        
    db.commit()
    return {"detail": "Request accepted"}

@router.post("/requests/{req_id}/reject")
def reject_join_request(
    req_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.TeamJoinRequest).filter(models.TeamJoinRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    team = db.query(models.Team).filter(models.Team.id == req.team_id).first()
    if team.captain_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    req.status = "Rejected"
    db.commit()
    return {"detail": "Request rejected"}
