from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

import models, schemas, database, auth

router = APIRouter(prefix="/recommendations", tags=["Smart Recommendation Engine"])

@router.get("/tournaments", response_model=List[schemas.Tournament])
def get_tournament_suggestions(
    limit: int = 5,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Suggests tournaments to the user based on their MMR, rank tier, and past participation.
    """
    # Base filter: Only suggest active or upcoming tournaments
    now = datetime.utcnow()
    query = db.query(models.Tournament).filter(
        models.Tournament.status.in_(["upcoming", "ongoing", "registration_open"])
    )

    # Collaborative Filtering / Content-Based Heuristic:
    # 1. Look for tournaments where the prize pool aligns with the user's tier.
    # High MMR/Tier -> Recommend higher stakes
    if current_user.tier in ["Diamond", "Immortal"] or current_user.mmr >= 1800:
        query = query.order_by(models.Tournament.prize_pool.desc())
    elif current_user.tier in ["Bronze", "Silver"]:
        # Beginner friendly, maybe lower entry fees or specific beginner brackets if those existed.
        # For now, we order by start_date to get them playing soon.
        query = query.order_by(models.Tournament.start_date.asc())
    else:
        # Mid-tier: blend of both
        query = query.order_by(models.Tournament.prize_pool.desc(), models.Tournament.start_date.asc())

    # Exclude tournaments the user is already registered for
    user_registrations = db.query(models.Registration.tournament_id).filter(
        models.Registration.user_id == current_user.id
    ).subquery()
    
    query = query.filter(models.Tournament.id.not_in(user_registrations))

    suggested = query.limit(limit).all()
    
    # Fallback if no specific recommendations are found, just return the most popular upcoming ones
    if not suggested:
        suggested = db.query(models.Tournament).filter(
            models.Tournament.status == "upcoming"
        ).order_by(models.Tournament.prize_pool.desc()).limit(limit).all()

    return suggested
