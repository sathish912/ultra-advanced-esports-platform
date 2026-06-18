import os
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import communications

def process_backlog():
    db = SessionLocal()
    try:
        # Get all Pending registrations
        pending_regs = db.query(models.Registration).filter(models.Registration.registration_status == "Pending").all()
        admin_user = db.query(models.User).filter(models.User.role == "admin").first()
        
        for reg in pending_regs:
            user = db.query(models.User).filter(models.User.id == reg.user_id).first()
            tournament = db.query(models.Tournament).filter(models.Tournament.id == reg.tournament_id).first()
            
            # 1. If admin, delete the registration
            if user and user.role == "admin":
                print(f"Deleting admin registration for {user.name}")
                db.delete(reg)
                continue
                
            if not user or not tournament:
                continue

            # 2. Check Wallet and Deduct Fee
            if tournament.entry_fee > 0:
                if user.wallet_balance >= tournament.entry_fee:
                    user.wallet_balance -= tournament.entry_fee
                    if admin_user:
                        admin_user.wallet_balance += tournament.entry_fee
                        
                    # Log Transaction
                    tx = models.Transaction(
                        user_id=user.id,
                        amount=-tournament.entry_fee,
                        currency=tournament.currency,
                        transaction_type="Entry_Fee",
                        status="Completed",
                        reference_id=str(tournament.id)
                    )
                    db.add(tx)
                else:
                    # Not enough balance, reject instead
                    print(f"User {user.name} does not have enough balance for {tournament.name}. Rejecting.")
                    reg.registration_status = "Rejected"
                    
                    # Notify rejection
                    communications.send_email(user.email, f"Registration Rejected: {tournament.name}", f"Unfortunately {user.name}, your registration was rejected due to insufficient wallet funds.")
                    if user.mobile_no:
                        communications.send_sms(user.mobile_no, f"ULTRA ESPORTS: Registration for {tournament.name} rejected (insufficient funds).")
                        communications.send_whatsapp(user.mobile_no, f"ULTRA ESPORTS: Registration for {tournament.name} rejected (insufficient funds).")
                    continue

            # 3. Approve and Init Leaderboard
            print(f"Approving registration for {user.name} in {tournament.name}")
            reg.registration_status = "Approved"
            
            # Check if leaderboard exists
            existing_lb = db.query(models.Leaderboard).filter(
                models.Leaderboard.player_id == user.id,
                models.Leaderboard.tournament_id == tournament.id
            ).first()
            if not existing_lb:
                new_lb = models.Leaderboard(
                    player_id=user.id,
                    tournament_id=tournament.id,
                    points=0, wins=0, kills=0, mvps=0, win_rate=0.0
                )
                db.add(new_lb)
                
            # 4. Dispatch Comms
            email_body = f"Congratulations {user.name}!\n\nYour registration for {tournament.name} has been officially approved. Prepare for battle.\n\nGLHF,\nUltra Esports Cyber Command"
            communications.send_email(user.email, f"Registration Approved: {tournament.name}", email_body)
            
            if user.mobile_no:
                msg = f"ULTRA ESPORTS ALERT: Your registration for '{tournament.name}' is approved! Welcome to the battleground."
                communications.send_sms(user.mobile_no, msg)
                communications.send_whatsapp(user.mobile_no, msg)
                
            # Portal Notification
            new_notification = models.Notification(
                user_id=user.id,
                title="Registration Approved",
                message=f"Your registration for {tournament.name} has been approved."
            )
            db.add(new_notification)

        db.commit()
        print("Backlog processing complete.")
    except Exception as e:
        db.rollback()
        print(f"Error processing backlog: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    process_backlog()
