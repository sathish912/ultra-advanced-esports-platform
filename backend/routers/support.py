from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas
from auth import get_current_user

router = APIRouter(
    prefix="/support",
    tags=["Support & Bug Bounty"]
)

@router.post("/tickets", response_model=schemas.SupportTicket)
def create_ticket(ticket: schemas.SupportTicketCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_ticket = models.SupportTicket(**ticket.model_dump(), user_id=current_user.id)
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.get("/tickets/my", response_model=List[schemas.SupportTicket])
def get_my_tickets(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SupportTicket).filter(models.SupportTicket.user_id == current_user.id).order_by(models.SupportTicket.created_at.desc()).all()

@router.get("/admin/tickets", response_model=List[schemas.SupportTicket])
def get_all_tickets(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.SupportTicket).order_by(models.SupportTicket.created_at.desc()).all()

@router.patch("/admin/tickets/{ticket_id}", response_model=schemas.SupportTicket)
def update_ticket(ticket_id: int, ticket_update: schemas.SupportTicketUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db_ticket.status = ticket_update.status
    
    # If bounty is awarded and hasn't been awarded before
    if ticket_update.bounty_awarded > 0 and db_ticket.bounty_awarded == 0:
        db_ticket.bounty_awarded = ticket_update.bounty_awarded
        
        # Credit user wallet
        user = db.query(models.User).filter(models.User.id == db_ticket.user_id).first()
        if user:
            user.wallet_balance += ticket_update.bounty_awarded
            # Log transaction
            tx = models.Transaction(
                user_id=user.id,
                amount=ticket_update.bounty_awarded,
                transaction_type="CREDIT",
                description=f"Bug Bounty Reward (Ticket #{db_ticket.id})",
                status="SUCCESS"
            )
            db.add(tx)
            
    db.commit()
    db.refresh(db_ticket)
    return db_ticket
