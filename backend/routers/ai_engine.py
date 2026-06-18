from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import json
import math

import models, schemas, database, auth

router = APIRouter(prefix="/ai", tags=["AI Driven Systems"])

def calculate_win_probability(elo_a: float, elo_b: float) -> float:
    """Standard Elo probability formula"""
    return 1.0 / (1.0 + math.pow(10, (elo_b - elo_a) / 400.0))

@router.get("/predict/{match_id}", response_model=schemas.AIPrediction)
def predict_match_outcome(
    match_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Predict the winner of a 1v1 Match based on historical MMR."""
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if not match.player1_id or not match.player2_id:
        raise HTTPException(status_code=400, detail="Prediction only available for 1v1 matches currently.")
        
    p1 = db.query(models.User).filter(models.User.id == match.player1_id).first()
    p2 = db.query(models.User).filter(models.User.id == match.player2_id).first()
    
    p1_prob = calculate_win_probability(p1.mmr, p2.mmr)
    
    predicted_winner = p1.id if p1_prob >= 0.5 else p2.id
    confidence = max(p1_prob, 1.0 - p1_prob)
    
    features = {
        "p1_mmr": p1.mmr,
        "p2_mmr": p2.mmr,
        "p1_win_rate": p1.wins / max(1, p1.wins + p1.losses),
        "p2_win_rate": p2.wins / max(1, p2.wins + p2.losses)
    }
    
    prediction = models.AIPrediction(
        match_id=match.id,
        predicted_winner_id=predicted_winner,
        confidence_score=confidence,
        features_used=json.dumps(features)
    )
    
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


@router.post("/anti-cheat/analyze/{match_id}")
def run_anti_cheat_analysis(
    match_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Run post-match heuristic analysis to flag suspicious behavior.
    Flags user if: Kills > 30 OR Sudden MMR spike > 500 (calculated by comparing current vs last season EloHistory).
    """
    participants = db.query(models.MatchParticipant).filter(models.MatchParticipant.match_id == match_id).all()
    flags_generated = 0
    
    for p in participants:
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        if not user:
            continue
            
        suspicious = False
        reason = ""
        
        # Rule 1: Kills > 30
        if p.kills > 30:
            suspicious = True
            reason = f"Anomalous kill count: {p.kills} kills in a single match."
            
        # Rule 2: Sudden 500 MMR spike
        # We can look at EloHistory for the last 24 hours.
        # If the gap between the oldest in 24h and current is > 500, flag it.
        # Since we might not have dense history, we'll just check if their current MMR is 500 higher than baseline (1000) for new accounts
        # Or check their most recent EloHistory record.
        last_history = db.query(models.EloHistory).filter(models.EloHistory.user_id == user.id).order_by(models.EloHistory.timestamp.desc()).first()
        if last_history:
            if (user.mmr - last_history.mmr) > 500:
                suspicious = True
                reason += f" Anomalous MMR spike detected (>500 jump)."
                
        if suspicious:
            flag = models.AntiCheatFlag(
                user_id=user.id,
                match_id=match_id,
                reason=reason.strip(),
                severity="High"
            )
            db.add(flag)
            
            # Penalize Trust Score
            user.ai_trust_score = max(0, user.ai_trust_score - 50)
            user.is_flagged = True
            flags_generated += 1
            
    db.commit()
    return {"detail": f"Analysis complete. Generated {flags_generated} flags."}


@router.post("/matchmaking/balance")
def ai_matchmaking_balance(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Sorts and groups registered players into optimal lobbies/squads based on MMR to minimize variance.
    Returns the optimized distribution array.
    """
    regs = db.query(models.Registration).filter(
        models.Registration.tournament_id == tournament_id,
        models.Registration.registration_status == "Approved"
    ).all()
    
    if not regs:
        raise HTTPException(status_code=400, detail="No approved registrations found.")
        
    users = [r.user for r in regs if r.user]
    
    # Simple algorithm: Sort by MMR descending
    users.sort(key=lambda u: u.mmr, reverse=True)
    
    # Snake draft algorithm to balance teams/lobbies (assuming we want to form 4 balanced teams of N size for demo)
    # E.g. 1 8 9 16
    #      2 7 10 15
    num_teams = 4
    teams = {i: [] for i in range(num_teams)}
    
    direction = 1
    team_idx = 0
    for u in users:
        teams[team_idx].append({
            "user_id": u.id,
            "name": u.name,
            "mmr": u.mmr
        })
        team_idx += direction
        if team_idx == num_teams or team_idx == -1:
            direction *= -1
            team_idx += direction
            
    # Calculate avg MMR for each team to show balance
    balanced_result = []
    for t_id, members in teams.items():
        avg_mmr = sum(m["mmr"] for m in members) / len(members) if members else 0
        balanced_result.append({
            "team_id": t_id,
            "average_mmr": round(avg_mmr, 2),
            "members": members
        })
        
    return {"balanced_teams": balanced_result}
