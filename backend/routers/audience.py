from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List

import models, schemas, database, auth

router = APIRouter(prefix="/audience", tags=["Audience Experience"])

# ==========================================
# MVP Voting
# ==========================================

@router.post("/match/{match_id}/mvp-vote")
def cast_mvp_vote(
    match_id: int,
    vote: schemas.MVPVoteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cast an MVP vote for a player in a specific match"""
    # Check if match exists
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Prevent duplicate voting
    existing_vote = db.query(models.MatchMVPVote).filter(
        models.MatchMVPVote.match_id == match_id,
        models.MatchMVPVote.spectator_id == current_user.id
    ).first()
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already voted for MVP in this match")

    new_vote = models.MatchMVPVote(
        match_id=match_id,
        spectator_id=current_user.id,
        player_id=vote.player_id
    )
    db.add(new_vote)
    db.commit()
    return {"detail": "MVP Vote Cast"}

@router.get("/match/{match_id}/mvp-results", response_model=List[schemas.MVPResult])
def get_mvp_results(
    match_id: int,
    db: Session = Depends(database.get_db)
):
    """Get live MVP vote counts for a match"""
    results = db.query(
        models.MatchMVPVote.player_id,
        models.User.name,
        models.User.avatar,
        func.count(models.MatchMVPVote.id).label("votes")
    ).join(models.User, models.MatchMVPVote.player_id == models.User.id)\
     .filter(models.MatchMVPVote.match_id == match_id)\
     .group_by(models.MatchMVPVote.player_id, models.User.name, models.User.avatar)\
     .order_by(desc("votes")).all()

    return [{"player_id": r[0], "player_name": r[1], "avatar": r[2], "votes": r[3]} for r in results]


# ==========================================
# Fantasy League
# ==========================================

@router.post("/fantasy", response_model=schemas.FantasyTeam)
def create_fantasy_team(
    team_data: schemas.FantasyTeamCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Create a new Fantasy Team"""
    existing = db.query(models.FantasyTeam).filter(models.FantasyTeam.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a Fantasy Team")

    team = models.FantasyTeam(user_id=current_user.id, name=team_data.name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@router.get("/fantasy/my-team", response_model=schemas.FantasyTeam)
def get_my_fantasy_team(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get current user's Fantasy Team and roster"""
    team = db.query(models.FantasyTeam).filter(models.FantasyTeam.user_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Fantasy Team not found")
    return team

@router.post("/fantasy/roster")
def add_player_to_roster(
    roster_add: schemas.FantasyTeamRosterAdd,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Draft a player to the Fantasy Team (Max 5)"""
    team = db.query(models.FantasyTeam).filter(models.FantasyTeam.user_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Create a Fantasy Team first")

    # Check max 5
    current_roster_count = db.query(models.FantasyTeamRoster).filter(models.FantasyTeamRoster.fantasy_team_id == team.id).count()
    if current_roster_count >= 5:
        raise HTTPException(status_code=400, detail="Roster full. Maximum 5 players allowed.")

    # Check if already added
    existing = db.query(models.FantasyTeamRoster).filter(
        models.FantasyTeamRoster.fantasy_team_id == team.id,
        models.FantasyTeamRoster.player_id == roster_add.player_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Player already in roster")

    target_player = db.query(models.User).filter(models.User.id == roster_add.player_id).first()
    if not target_player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Calculate price based on MMR (minimum 500)
    fantasy_price = max(500, int((target_player.mmr or 1000) / 10))

    if team.budget_remaining < fantasy_price:
        raise HTTPException(status_code=400, detail=f"Insufficient budget. Player costs {fantasy_price} Credits.")

    team.budget_remaining -= fantasy_price

    new_member = models.FantasyTeamRoster(fantasy_team_id=team.id, player_id=roster_add.player_id)
    db.add(new_member)
    db.commit()
    return {"detail": "Player added to Fantasy Team", "budget_remaining": team.budget_remaining}

@router.delete("/fantasy/roster/{player_id}")
def remove_player_from_roster(
    player_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Remove a player from Fantasy Team"""
    team = db.query(models.FantasyTeam).filter(models.FantasyTeam.user_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Fantasy Team not found")

    member = db.query(models.FantasyTeamRoster).filter(
        models.FantasyTeamRoster.fantasy_team_id == team.id,
        models.FantasyTeamRoster.player_id == player_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Player not in roster")

    target_player = db.query(models.User).filter(models.User.id == player_id).first()
    if target_player:
        fantasy_price = max(500, int((target_player.mmr or 1000) / 10))
        team.budget_remaining += fantasy_price

    db.delete(member)
    db.commit()
    return {"detail": "Player removed from Fantasy Team", "budget_remaining": team.budget_remaining}

@router.get("/fantasy/leaderboard", response_model=List[schemas.FantasyTeam])
def get_fantasy_leaderboard(
    db: Session = Depends(database.get_db)
):
    """Get Global Fantasy Leaderboard"""
    return db.query(models.FantasyTeam).order_by(desc(models.FantasyTeam.score)).limit(50).all()

@router.post("/fantasy/calculate-scores")
def calculate_fantasy_scores(
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(auth.get_current_admin_user)
):
    """Admin function to update Fantasy Team scores based on match participant stats"""
    teams = db.query(models.FantasyTeam).all()
    for team in teams:
        # Sum all total_points from MatchParticipant for each player in roster
        total = 0
        for roster_member in team.roster:
            pts = db.query(func.sum(models.MatchParticipant.total_points)).filter(
                models.MatchParticipant.user_id == roster_member.player_id
            ).scalar()
            if pts:
                total += pts
        team.score = total
    db.commit()
    return {"detail": "Scores updated"}
