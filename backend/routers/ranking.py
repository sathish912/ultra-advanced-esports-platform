from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from cachetools import TTLCache
import time

import models, schemas, database, auth

router = APIRouter(prefix="/ranking", tags=["Ranking Ecosystem"])

TIER_THRESHOLDS = {
    "Bronze": 0,
    "Silver": 1200,
    "Gold": 1500,
    "Platinum": 2000,
    "Diamond": 2500,
    "Immortal": 3000
}

def determine_tier(mmr: float) -> str:
    if mmr >= TIER_THRESHOLDS["Immortal"]: return "Immortal"
    if mmr >= TIER_THRESHOLDS["Diamond"]: return "Diamond"
    if mmr >= TIER_THRESHOLDS["Platinum"]: return "Platinum"
    if mmr >= TIER_THRESHOLDS["Gold"]: return "Gold"
    if mmr >= TIER_THRESHOLDS["Silver"]: return "Silver"
    return "Bronze"

# Cache the global leaderboard for 30 seconds
cache_global = TTLCache(maxsize=10, ttl=30)

@router.get("/leaderboard")
def get_global_leaderboard(db: Session = Depends(database.get_db)):
    """Get the global Elo ranking leaderboard"""
    if "global" in cache_global:
        return cache_global["global"]

    users = db.query(models.User).filter(
        models.User.role == "player"
    ).order_by(models.User.mmr.desc()).all()
    
    result = [{
        "player_id": u.id,
        "name": u.name,
        "avatar": u.avatar,
        "tier": u.tier,
        "mmr": round(u.mmr, 2),
        "rank_points": u.ranking_points,
        "win_rate": (u.wins / (u.wins + u.losses)) if (u.wins + u.losses) > 0 else 0.0,
        "country": u.country
    } for u in users]
    cache_global["global"] = result
    return result

# Cache country leaderboards for 30 seconds
cache_country = TTLCache(maxsize=100, ttl=30)

@router.get("/leaderboard/{country}")
def get_country_leaderboard(country: str, db: Session = Depends(database.get_db)):
    """Get the Elo ranking leaderboard filtered by country"""
    if country in cache_country:
        return cache_country[country]

    users = db.query(models.User).filter(
        models.User.role == "player",
        func.lower(models.User.country) == country.lower()
    ).order_by(models.User.mmr.desc()).all()
    
    result = [{
        "player_id": u.id,
        "name": u.name,
        "tier": u.tier,
        "mmr": round(u.mmr, 2)
    } for u in users]
    cache_country[country] = result
    return result

@router.post("/seasons", response_model=schemas.Season)
def create_season(
    season: schemas.SeasonBase,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin: Start a new competitive season"""
    db_season = models.Season(**season.model_dump())
    db.add(db_season)
    db.commit()
    db.refresh(db_season)
    return db_season

@router.post("/seasons/{season_id}/reset")
def trigger_seasonal_reset(
    season_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin: End the season and trigger MMR soft resets"""
    season = db.query(models.Season).filter(models.Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
        
    season.is_active = False
    season.end_date = datetime.utcnow()
    
    players = db.query(models.User).filter(models.User.role == "player").all()
    
    for player in players:
        # Soft Reset Logic: (Current MMR + 1000) / 2
        new_mmr = (player.mmr + 1000) / 2
        new_tier = determine_tier(new_mmr)
        
        # Log final season history
        history = models.EloHistory(
            user_id=player.id,
            season_id=season.id,
            mmr=player.mmr,
            tier=player.tier
        )
        db.add(history)
        
        # Apply reset
        player.mmr = new_mmr
        player.tier = new_tier
        
    db.commit()
    return {"detail": f"Season {season.name} ended and soft MMR reset applied."}

@router.post("/decay")
def apply_rank_decay(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Admin/Cron Task: Apply rank decay to inactive players (Diamond and above)"""
    decay_threshold = datetime.utcnow() - timedelta(days=14)
    
    # Target players in Diamond/Immortal who haven't played in 14 days
    inactive_players = db.query(models.User).filter(
        models.User.role == "player",
        models.User.tier.in_(["Diamond", "Immortal"]),
        (models.User.rank_decay_date < decay_threshold) | (models.User.rank_decay_date == None)
    ).all()
    
    decayed_count = 0
    for player in inactive_players:
        # Penalize MMR by 50 points
        player.mmr = max(TIER_THRESHOLDS["Platinum"], player.mmr - 50) 
        player.tier = determine_tier(player.mmr)
        player.rank_decay_date = datetime.utcnow() # Reset the decay timer after penalizing
        decayed_count += 1
        
    db.commit()
    return {"detail": f"Rank decay applied to {decayed_count} players."}
