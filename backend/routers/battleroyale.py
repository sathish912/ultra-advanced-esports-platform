from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import math

import models, schemas, database, auth
from routers.ai_engine import run_anti_cheat_analysis
from automation import auto_calculate_fantasy_scores

router = APIRouter(prefix="/battleroyale", tags=["Battle Royale Features"])

@router.patch("/matches/{match_id}/room")
def update_room_credentials(
    match_id: int,
    creds: schemas.RoomCredentialsUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin: Publish Custom Room ID and Password for a Match"""
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    db_match.room_id = creds.room_id
    db_match.room_password = creds.room_password
    db.commit()
    db.refresh(db_match)
    
    # Ideally, trigger a WebSocket push to all registered players of this match here
    return {"detail": "Room credentials published", "match_id": match_id}

@router.post("/matches/{match_id}/results")
def submit_br_results(
    match_id: int,
    results: schemas.BRMatchResultSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin: Submit bulk placements and kills for a Battle Royale Match"""
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    for p_res in results.participants:
        # Placement Points Logic: 1st=100, 2nd=80, 3rd=60, Top10=30, Top20=10
        surv_pts = 0.0
        if p_res.placement == 1: surv_pts = 100.0
        elif p_res.placement == 2: surv_pts = 80.0
        elif p_res.placement == 3: surv_pts = 60.0
        elif p_res.placement <= 10: surv_pts = 30.0
        elif p_res.placement <= 20: surv_pts = 10.0
        
        # Kill Points: 15 pts per kill
        kill_pts = float(p_res.kills * 15)
        
        total = surv_pts + kill_pts
        
        participant = models.MatchParticipant(
            match_id=match_id,
            user_id=p_res.user_id,
            team_id=p_res.team_id,
            placement=p_res.placement,
            kills=p_res.kills,
            survival_points=surv_pts,
            kill_points=kill_pts,
            total_points=total
        )
        db.add(participant)
        
        # We should also update the player's overall MMR based on this performance.
        # Simple BR MMR calc: +2 MMR per kill, +50 for win, -10 if placement > 50
        if p_res.user_id:
            user = db.query(models.User).filter(models.User.id == p_res.user_id).first()
            if user:
                user.kills += p_res.kills
                if p_res.placement == 1: user.wins += 1
                else: user.losses += 1
                
                mmr_change = (p_res.kills * 2)
                if p_res.placement == 1: mmr_change += 50
                elif p_res.placement > 50: mmr_change -= 10
                
                user.mmr += mmr_change
                user.ranking_points += int(total)
                
                from routers.ranking import determine_tier
                user.tier = determine_tier(user.mmr)

    db_match.match_status = "Completed"
    
    # End associated streams
    active_streams = db.query(models.Stream).filter(models.Stream.match_id == match_id).all()
    for stream in active_streams:
        stream.is_live = False
        
    db.commit()
    
    # Trigger AI Anti-Cheat Analysis automatically
    run_anti_cheat_analysis(match_id=match_id, db=db, current_user=current_user)
    
    # Trigger Fantasy Scores Recalculation in the background
    background_tasks.add_task(auto_calculate_fantasy_scores)
    
    return {"detail": f"Results submitted for {len(results.participants)} participants. Anti-cheat analysis triggered."}

@router.get("/matches/{match_id}/leaderboard")
def get_br_match_leaderboard(
    match_id: int,
    db: Session = Depends(database.get_db)
):
    """View the placement and kills leaderboard for a specific BR match"""
    participants = db.query(models.MatchParticipant).filter(
        models.MatchParticipant.match_id == match_id
    ).order_by(models.MatchParticipant.placement.asc(), models.MatchParticipant.kills.desc()).all()
    
    res = []
    for p in participants:
        res.append({
            "placement": p.placement,
            "player_name": p.user.name if p.user else "Unknown",
            "team_name": p.team.name if p.team else None,
            "kills": p.kills,
            "survival_points": p.survival_points,
            "kill_points": p.kill_points,
            "total_points": p.total_points
        })
    return res

@router.get("/matches/{match_id}/room", response_model=schemas.RoomCredentialsUpdate)
def get_room_credentials(
    match_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Registered Player: Get Custom Room ID and Password"""
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")

    member = db.query(models.TeamMember).join(models.Team).filter(
        models.TeamMember.user_id == current_user.id,
        models.Team.tournament_id == db_match.tournament_id
    ).first()

    if not member and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You are not participating in this match")

    if not db_match.room_id:
        raise HTTPException(status_code=404, detail="Room credentials not yet published")

    return schemas.RoomCredentialsUpdate(
        room_id=db_match.room_id,
        room_password=db_match.room_password
    )
