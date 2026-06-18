from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, database, auth

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("")
def get_analytics(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    total_players = db.query(models.User).filter(models.User.role == "player").count()
    total_tourneys = db.query(models.Tournament).count()
    total_matches = db.query(models.Match).count()
    active_matches = db.query(models.Match).filter(models.Match.match_status == "Ongoing").count()
    
    # Tournament Status breakdown
    upcoming = db.query(models.Tournament).filter(models.Tournament.status == "Upcoming").count()
    reg_open = db.query(models.Tournament).filter(models.Tournament.status == "Registration Open").count()
    ongoing = db.query(models.Tournament).filter(models.Tournament.status == "Ongoing").count()
    completed = db.query(models.Tournament).filter(models.Tournament.status == "Completed").count()
    
    # Registration breakdown
    total_regs = db.query(models.Registration).count()
    pending = db.query(models.Registration).filter(models.Registration.registration_status == "Pending").count()
    approved = db.query(models.Registration).filter(models.Registration.registration_status == "Approved").count()
    
    # Game popularity (Tournaments count)
    game_popularity_query = db.query(models.Tournament.game, func.count(models.Tournament.id)).group_by(models.Tournament.game).all()
    game_popularity = {game: count for game, count in game_popularity_query}
    
    return {
        "total_players": total_players,
        "total_tournaments": total_tourneys,
        "total_matches": total_matches,
        "active_matches": active_matches,
        "tournaments_by_status": {
            "Upcoming": upcoming,
            "Registration Open": reg_open,
            "Ongoing": ongoing,
            "Completed": completed
        },
        "registrations": {
            "total": total_regs,
            "pending": pending,
            "approved": approved
        },
        "games_popularity": game_popularity
    }
