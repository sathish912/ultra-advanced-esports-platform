from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

import models, schemas, database, auth

router = APIRouter(prefix="/tournaments", tags=["Monetization Workflows"])

@router.post("/{tournament_id}/distribute-prizes")
def distribute_tournament_prizes(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Automated Prize Distribution - Winner Takes All.
    Closes the tournament, finds the winner, and transfers 100% of the prize pool to their wallet.
    """
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    if tournament.status == "Completed":
        raise HTTPException(status_code=400, detail="Prizes have already been distributed for this tournament")
        
    if tournament.prize_pool <= 0:
        tournament.status = "Completed"
        db.commit()
        return {"detail": "Tournament completed. No prize pool to distribute."}

    # Find the winner (assuming match_status="Completed" for the Grand Final or based on Leaderboard)
    # If it's a BR match, we find the MatchParticipant with placement=1
    if tournament.is_battle_royale:
        # Get the match for this tournament
        match = db.query(models.Match).filter(models.Match.tournament_id == tournament.id).first()
        if not match:
            raise HTTPException(status_code=400, detail="No matches found for this tournament")
            
        winner_participant = db.query(models.MatchParticipant).filter(
            models.MatchParticipant.match_id == match.id,
            models.MatchParticipant.placement == 1
        ).first()
        
        if not winner_participant:
            raise HTTPException(status_code=400, detail="Winner not found for this Battle Royale match")
            
        winner = winner_participant.user
    else:
        # Standard 1v1 Bracket - Assume we find the match where round is highest (final) and winner is set
        final_match = db.query(models.Match).filter(
            models.Match.tournament_id == tournament.id,
            models.Match.match_status == "Completed"
        ).order_by(models.Match.round.desc()).first()
        
        if not final_match or not final_match.winner_id:
            raise HTTPException(status_code=400, detail="Tournament final match winner not determined")
            
        winner = final_match.winner

    if not winner:
        raise HTTPException(status_code=400, detail="Could not determine a winner")
        
    # Payout logic - Winner Takes All (100% of prize pool)
    payout_amount = tournament.prize_pool
    
    winner.wallet_balance += payout_amount
    winner.total_earnings += payout_amount
    
    # Log Prize Payout Transaction
    tx = models.Transaction(
        user_id=winner.id,
        amount=payout_amount,
        currency=tournament.currency,
        transaction_type="Prize_Payout",
        status="Completed",
        reference_id=f"tourney_{tournament.id}"
    )
    db.add(tx)
    
    # Deduct from platform admin (assuming platform holds funds in escrow)
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if admin:
        admin.wallet_balance -= payout_amount
        
    tournament.status = "Completed"
    db.commit()
    
    return {
        "detail": f"Successfully distributed {tournament.currency} {payout_amount} to {winner.name}",
        "winner": winner.name,
        "amount": payout_amount
    }
