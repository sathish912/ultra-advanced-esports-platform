from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
import os
import random
import auth
import schemas
from websockets_manager import manager
from discord_webhook import send_discord_notification
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import timedelta, datetime

import models, database
from database import engine

import stripe
import json
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "YOUR_STRIPE_SECRET_KEY")

# Global Notification Helper
async def send_notification(db: Session, user_id: int, title: str, message: str):
    db_notif = models.Notification(user_id=user_id, title=title, message=message)
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    # Broadcast real-time WebSocket alert
    await manager.broadcast({
        "type": "notification",
        "user_id": user_id,
        "notification": {
            "id": db_notif.id,
            "title": db_notif.title,
            "message": db_notif.message,
            "is_read": db_notif.is_read,
            "created_at": db_notif.created_at.isoformat()
        }
    })


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Advanced eSports Tournament Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
if not os.path.exists(os.path.join(STATIC_DIR, "avatars")):
    os.makedirs(os.path.join(STATIC_DIR, "avatars"))

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Authentication Endpoints
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed_data = json.loads(data)
                if parsed_data.get("type") == "CHAT" or parsed_data.get("type") == "SUPER_CHAT":
                    # Broadcast chat messages back to all connected clients
                    await manager.broadcast(parsed_data)
            except:
                pass
    except:
        manager.disconnect(websocket)

@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        role=user.role,
        avatar=user.avatar
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not db_user or not auth.verify_password(form_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}

@app.get("/profile", response_model=schemas.User)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# Tournament Endpoints
@app.get("/tournaments", response_model=List[schemas.Tournament])
def get_tournaments(db: Session = Depends(database.get_db)):
    return db.query(models.Tournament).all()

@app.post("/tournaments", response_model=schemas.Tournament)
def create_tournament(
    tournament: schemas.TournamentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_tournament = models.Tournament(**tournament.dict())
    db.add(db_tournament)
    db.commit()
    db.refresh(db_tournament)
    return db_tournament

@app.patch("/tournaments/{tournament_id}", response_model=schemas.Tournament)
def update_tournament(
    tournament_id: int,
    tournament_update: schemas.TournamentUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not db_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    update_data = tournament_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tournament, key, value)
        
    db.commit()
    db.refresh(db_tournament)
    return db_tournament

@app.delete("/tournaments/{tournament_id}")
def delete_tournament(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not db_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    db.delete(db_tournament)
    db.commit()
    return {"detail": "Tournament deleted"}

# Registration Endpoints
@app.post("/register-tournament")
async def register_for_tournament(
    reg_data: schemas.RegistrationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "player":
        raise HTTPException(status_code=403, detail="Only players can register for tournaments")
    
    # 1. Check if tournament exists
    tournament = db.query(models.Tournament).filter(models.Tournament.id == reg_data.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=444, detail="Tournament not found")
        
    # 2. Prevent invalid joins (only allow if status is Upcoming or Registration Open)
    if tournament.status not in ["Upcoming", "Registration Open"]:
        raise HTTPException(status_code=400, detail=f"Cannot join tournament. Registration is {tournament.status.lower()}")

    existing = db.query(models.Registration).filter(
        models.Registration.user_id == current_user.id,
        models.Registration.tournament_id == reg_data.tournament_id
    ).first()
    if existing:
        if existing.registration_status == "Pending" and tournament.entry_fee > 0:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'inr',
                        'product_data': {
                            'name': f"Entry Fee: {tournament.name}",
                        },
                        'unit_amount': int(tournament.entry_fee * 100), # amount in paise
                    },
                    'quantity': 1,
                }],
                mode='payment',
                client_reference_id=str(existing.id),
                success_url=f"http://localhost:5173/tournaments?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url="http://localhost:5173/tournaments",
            )
            return {
                "id": existing.id,
                "tournament_id": existing.tournament_id,
                "user_id": existing.user_id,
                "registration_status": existing.registration_status,
                "checkout_url": session.url
            }
        else:
            raise HTTPException(status_code=400, detail="You are already registered for this tournament")
        
    # 4. Enforce player limits
    current_players_count = db.query(models.Registration).filter(
        models.Registration.tournament_id == reg_data.tournament_id,
        models.Registration.registration_status != "Rejected"
    ).count()
    if current_players_count >= tournament.max_players:
        raise HTTPException(status_code=400, detail="This tournament is currently at maximum capacity")
        
    new_reg = models.Registration(
        user_id=current_user.id,
        tournament_id=reg_data.tournament_id,
        registration_status="Pending"
    )
    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)

    checkout_url = None
    if tournament.entry_fee > 0:
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f"Entry Fee: {tournament.name}",
                    },
                    'unit_amount': int(tournament.entry_fee * 100), # amount in paise
                },
                'quantity': 1,
            }],
            mode='payment',
            client_reference_id=str(new_reg.id),
            success_url=f"http://localhost:5173/tournaments?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url="http://localhost:5173/tournaments",
        )
        checkout_url = session.url
    else:
        new_reg.registration_status = "Approved"
        existing_lb = db.query(models.Leaderboard).filter(
            models.Leaderboard.player_id == new_reg.user_id,
            models.Leaderboard.tournament_id == new_reg.tournament_id
        ).first()
        if not existing_lb:
            new_lb = models.Leaderboard(
                player_id=new_reg.user_id,
                tournament_id=new_reg.tournament_id,
                points=0, wins=0, kills=0, mvps=0, win_rate=0.0
            )
            db.add(new_lb)
        db.commit()

    # We need to construct the response manually to add checkout_url
    return {
        "id": new_reg.id,
        "tournament_id": new_reg.tournament_id,
        "user_id": new_reg.user_id,
        "registration_status": new_reg.registration_status,
        "checkout_url": checkout_url
    }

@app.get("/verify-tournament-payment")
async def verify_tournament_payment(session_id: str, db: Session = Depends(database.get_db)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            reg_id = int(session.client_reference_id)
            db_reg = db.query(models.Registration).filter(models.Registration.id == reg_id).first()
            if db_reg and db_reg.registration_status == "Pending":
                db_reg.registration_status = "Approved"
                
                # Initialize Leaderboard
                existing_lb = db.query(models.Leaderboard).filter(
                    models.Leaderboard.player_id == db_reg.user_id,
                    models.Leaderboard.tournament_id == db_reg.tournament_id
                ).first()
                if not existing_lb:
                    new_lb = models.Leaderboard(
                        player_id=db_reg.user_id,
                        tournament_id=db_reg.tournament_id,
                        points=0, wins=0, kills=0, mvps=0, win_rate=0.0
                    )
                    db.add(new_lb)
                    
                db.commit()
                return {"status": "success", "message": "Payment verified and registration approved."}
            return {"status": "already_approved", "message": "Registration is already approved."}
        else:
            return {"status": "unpaid", "message": "Payment not completed yet."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/my-tournaments")
def get_my_tournaments(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.role != "player":
        raise HTTPException(status_code=403, detail="Not a player")
    regs = db.query(models.Registration).filter(
        models.Registration.user_id == current_user.id,
        models.Registration.registration_status == "Approved"
    ).all()
    return [r.tournament for r in regs]

@app.get("/my-registrations")
def get_my_registrations(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.role != "player":
        return []
    regs = db.query(models.Registration).filter(
        models.Registration.user_id == current_user.id
    ).all()
    return [{
        "tournament_id": r.tournament_id,
        "status": r.registration_status
    } for r in regs]

@app.get("/registrations", response_model=List[schemas.Registration])
def get_registrations(
    tournament_id: Optional[int] = None,
    registration_status: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    query = db.query(models.Registration)
    if tournament_id is not None:
        query = query.filter(models.Registration.tournament_id == tournament_id)
    if registration_status is not None:
        query = query.filter(models.Registration.registration_status == registration_status)
    return query.all()

@app.patch("/registrations/{registration_id}", response_model=schemas.Registration)
async def update_registration_status(
    registration_id: int,
    status_update: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_reg = db.query(models.Registration).filter(models.Registration.id == registration_id).first()
    if not db_reg:
        raise HTTPException(status_code=404, detail="Registration request not found")
        
    new_status = status_update.get("status")
    if new_status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Status must be either Approved or Rejected")
        
    db_reg.registration_status = new_status
    db_reg.reviewed_by = current_user.id
    
    # If approved, automatically initialize an entry in the Tournament Leaderboard
    if new_status == "Approved":
        existing_lb = db.query(models.Leaderboard).filter(
            models.Leaderboard.player_id == db_reg.user_id,
            models.Leaderboard.tournament_id == db_reg.tournament_id
        ).first()
        if not existing_lb:
            new_lb = models.Leaderboard(
                player_id=db_reg.user_id,
                tournament_id=db_reg.tournament_id,
                points=0,
                wins=0,
                kills=0,
                mvps=0,
                win_rate=0.0
            )
            db.add(new_lb)
            
    db.commit()
    db.refresh(db_reg)
    
    # Dispatch real-time DB notification and push WS update to the player
    title = f"Registration {new_status}!"
    message = f"Your registration request for '{db_reg.tournament.name}' has been {new_status.lower()}."
    await send_notification(db, db_reg.user_id, title, message)
    
    return db_reg


# Match APIs
@app.post("/matches", response_model=schemas.Match)
def create_match(
    match: schemas.MatchCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_match = models.Match(**match.dict())
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    return db_match

@app.post("/tournaments/{tournament_id}/schedule")
async def generate_tournament_schedule(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    # Get all approved registrations
    regs = db.query(models.Registration).filter(
        models.Registration.tournament_id == tournament_id,
        models.Registration.registration_status == "Approved"
    ).all()
    
    if not regs:
        raise HTTPException(status_code=400, detail="Cannot schedule tournament with 0 approved players")
        
    players = [r.user for r in regs]
    random.shuffle(players)
    
    # Check if there are matches already generated for this tournament
    existing_matches = db.query(models.Match).filter(models.Match.tournament_id == tournament_id).first()
    if existing_matches:
        raise HTTPException(status_code=400, detail="Matches have already been scheduled for this tournament")
        
    # Generate 1v1 matchups for Round 1
    scheduled_matches = []
    i = 0
    while i < len(players):
        if i + 1 < len(players):
            new_match = models.Match(
                tournament_id=tournament_id,
                player1_id=players[i].id,
                player2_id=players[i+1].id,
                match_status="Scheduled",
                round=1,
                player1_score=0,
                player2_score=0
            )
            db.add(new_match)
            scheduled_matches.append(new_match)
            i += 2
        else:
            # Bye match for the odd player out
            bye_match = models.Match(
                tournament_id=tournament_id,
                player1_id=players[i].id,
                player2_id=None,
                match_status="Completed",
                winner_id=players[i].id,
                round=1,
                scores="Bye",
                player1_score=1,
                player2_score=0
            )
            db.add(bye_match)
            scheduled_matches.append(bye_match)
            i += 1
            
    # Transition tournament status to Ongoing
    tournament.status = "Ongoing"
    db.commit()
    
    # Send notifications to all competitors
    for match in scheduled_matches:
        db.refresh(match)
        if match.player1_id:
            await send_notification(
                db, 
                match.player1_id, 
                "Tournament Started!", 
                f"Matches have been drawn for '{tournament.name}'. You are playing in Round 1!"
            )
        if match.player2_id:
            await send_notification(
                db, 
                match.player2_id, 
                "Tournament Started!", 
                f"Matches have been drawn for '{tournament.name}'. You are playing in Round 1!"
            )
            
    # Broadcast to WS
    await manager.broadcast({"type": "matches_scheduled", "tournament_id": tournament_id})
    return {"detail": "Round 1 matches scheduled successfully", "matches_count": len(scheduled_matches)}

@app.post("/tournaments/{tournament_id}/next-round")
async def generate_next_round_schedule(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    # Get the max round scheduled so far
    max_round_match = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id
    ).order_by(models.Match.round.desc()).first()
    
    if not max_round_match:
        raise HTTPException(status_code=400, detail="Tournament has not been scheduled yet")
        
    current_round = max_round_match.round
    
    # Verify that all matches in the current round are completed
    active_matches = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.round == current_round,
        models.Match.match_status != "Completed"
    ).all()
    
    if active_matches:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot generate next round. There are {len(active_matches)} incomplete matches in Round {current_round}."
        )
        
    # Retrieve all winners of the current round
    winners_matches = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.round == current_round
    ).all()
    
    winners = []
    for m in winners_matches:
        if m.winner_id:
            w_user = db.query(models.User).filter(models.User.id == m.winner_id).first()
            if w_user:
                winners.append(w_user)
                
    if len(winners) <= 1:
        # Only 1 winner left! Tournament is fully completed!
        if len(winners) == 1:
            tournament.status = "Completed"
            db.commit()
            
            # Send Notification to the Champion
            champion = winners[0]
            await send_notification(
                db, 
                champion.id, 
                "🏆 Tournament Champion!", 
                f"Congratulations! You have won the tournament '{tournament.name}' and declared the Champion!"
            )
            
            await manager.broadcast({"type": "tournament_completed", "tournament_id": tournament_id, "champion_id": champion.id})
            return {"detail": "Tournament completed! Champion declared.", "champion": champion.name}
        else:
            raise HTTPException(status_code=400, detail="No winners found in the current round")
            
    # Pair the winners for the next round
    next_round = current_round + 1
    scheduled_matches = []
    random.shuffle(winners)
    
    i = 0
    while i < len(winners):
        if i + 1 < len(winners):
            new_match = models.Match(
                tournament_id=tournament_id,
                player1_id=winners[i].id,
                player2_id=winners[i+1].id,
                match_status="Scheduled",
                round=next_round,
                player1_score=0,
                player2_score=0
            )
            db.add(new_match)
            scheduled_matches.append(new_match)
            i += 2
        else:
            # Bye match for odd winner counts
            bye_match = models.Match(
                tournament_id=tournament_id,
                player1_id=winners[i].id,
                player2_id=None,
                match_status="Completed",
                winner_id=winners[i].id,
                round=next_round,
                scores="Bye",
                player1_score=1,
                player2_score=0
            )
            db.add(bye_match)
            scheduled_matches.append(bye_match)
            i += 1
            
    db.commit()
    
    # Notify players
    for match in scheduled_matches:
        db.refresh(match)
        if match.player1_id:
            await send_notification(
                db, 
                match.player1_id, 
                "Advanced to Next Round!", 
                f"You have advanced to Round {next_round} in '{tournament.name}'! Match scheduled."
            )
        if match.player2_id:
            await send_notification(
                db, 
                match.player2_id, 
                "Advanced to Next Round!", 
                f"You have advanced to Round {next_round} in '{tournament.name}'! Match scheduled."
            )
            
    await manager.broadcast({"type": "next_round_scheduled", "tournament_id": tournament_id, "round": next_round})
    return {"detail": f"Round {next_round} matches scheduled successfully", "matches_count": len(scheduled_matches)}

@app.patch("/matches/{match_id}/result", response_model=schemas.Match)
async def update_match_result(
    match_id: int,
    match_update: schemas.MatchUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match_update.player1_score is not None:
        db_match.player1_score = match_update.player1_score
    if match_update.player2_score is not None:
        db_match.player2_score = match_update.player2_score
    if match_update.player1_kills is not None:
        db_match.player1_kills = match_update.player1_kills
    if match_update.player2_kills is not None:
        db_match.player2_kills = match_update.player2_kills
    if match_update.winner_id is not None:
        db_match.winner_id = match_update.winner_id
    if match_update.scores is not None:
        db_match.scores = match_update.scores
        
    old_status = db_match.match_status
    if match_update.match_status is not None:
        db_match.match_status = match_update.match_status

    if db_match.match_status == "Completed" and old_status != "Completed":
        winner_id = db_match.winner_id
        if not winner_id and db_match.player2_id is not None:
            if db_match.player1_score > db_match.player2_score:
                winner_id = db_match.player1_id
            elif db_match.player2_score > db_match.player1_score:
                winner_id = db_match.player2_id
            else:
                raise HTTPException(status_code=400, detail="Cannot tie in knockout. Please declare winner_id explicitly.")
            db_match.winner_id = winner_id

        p1_id = db_match.player1_id
        p2_id = db_match.player2_id
        w_id = winner_id
        l_id = p2_id if w_id == p1_id else p1_id
        
        # Points calculation: +50 for win, +10 for loss, +2 per kill
        p1_pts = (50 if p1_id == w_id else 10) + (db_match.player1_kills * 2)
        p2_pts = 0
        if p2_id:
            p2_pts = (50 if p2_id == w_id else 10) + (db_match.player2_kills * 2)
            
        p1_user = db.query(models.User).filter(models.User.id == p1_id).first()
        if p1_user:
            p1_user.ranking_points += p1_pts
            p1_user.kills += db_match.player1_kills
            if p1_id == w_id:
                p1_user.wins += 1
            else:
                p1_user.losses += 1
            p1_user.ranking_points += p1_pts
                
            # Check Achievements
            if p1_user.wins == 1 and not (p1_user.achievements and "First Blood" in p1_user.achievements):
                p1_user.achievements = (p1_user.achievements + ",First Blood") if p1_user.achievements else "First Blood"
            if p1_user.kills >= 50 and not (p1_user.achievements and "Sharpshooter" in p1_user.achievements):
                p1_user.achievements = (p1_user.achievements + ",Sharpshooter") if p1_user.achievements else "Sharpshooter"
            if p1_user.wins >= 10 and not (p1_user.achievements and "Gladiator" in p1_user.achievements):
                p1_user.achievements = (p1_user.achievements + ",Gladiator") if p1_user.achievements else "Gladiator"
            
            # Anti-Cheat Engine Check
            p1_total = p1_user.wins + p1_user.losses
            p1_wr = p1_user.wins / p1_total if p1_total > 0 else 0
            if (p1_total > 5 and p1_wr > 0.90) or db_match.player1_kills > 40:
                p1_user.is_flagged = True

                
        p2_user = None
        if p2_id:
            p2_user = db.query(models.User).filter(models.User.id == p2_id).first()
            if p2_user:
                p2_user.ranking_points += p2_pts
                
                # Check Achievements
                if p2_user.wins == 1 and not (p2_user.achievements and "First Blood" in p2_user.achievements):
                    p2_user.achievements = (p2_user.achievements + ",First Blood") if p2_user.achievements else "First Blood"
                if p2_user.kills >= 50 and not (p2_user.achievements and "Sharpshooter" in p2_user.achievements):
                    p2_user.achievements = (p2_user.achievements + ",Sharpshooter") if p2_user.achievements else "Sharpshooter"
                if p2_user.wins >= 10 and not (p2_user.achievements and "Gladiator" in p2_user.achievements):
                    p2_user.achievements = (p2_user.achievements + ",Gladiator") if p2_user.achievements else "Gladiator"
                p2_user.kills += db_match.player2_kills
                if p2_id == w_id:
                    p2_user.wins += 1
                else:
                    p2_user.losses += 1
                    
                # Anti-Cheat Engine Check
                p2_total = p2_user.wins + p2_user.losses
                p2_wr = p2_user.wins / p2_total if p2_total > 0 else 0
                if (p2_total > 5 and p2_wr > 0.90) or db_match.player2_kills > 40:
                    p2_user.is_flagged = True

                    
        # Send match result notification
        winner = db.query(models.User).filter(models.User.id == winner_id).first()
        winner_name = winner.name if winner else f"Player {winner_id}"
        tourney = db.query(models.Tournament).filter(models.Tournament.id == db_match.tournament_id).first()
        tourney_name = tourney.name if tourney else "Tournament"
        
        send_discord_notification(
            title=f"Match Result: {tourney_name}",
            description=f"Round {db_match.round} completed! Winner: **{winner_name}**"
        )
        import asyncio
        asyncio.create_task(manager.broadcast({
            "type": "MATCH_RESULT",
            "message": f"Match completed in {tourney_name}: {winner_name} wins!"
        }))

        # Update Leaderboards
        p1_lb = db.query(models.Leaderboard).filter(
            models.Leaderboard.player_id == p1_id,
            models.Leaderboard.tournament_id == db_match.tournament_id
        ).first()
        if p1_lb:
            p1_lb.points += p1_pts
            p1_lb.kills += db_match.player1_kills
            if p1_id == w_id:
                p1_lb.wins += 1
            total_g = p1_lb.wins + (db.query(models.Match).filter(
                models.Match.tournament_id == db_match.tournament_id,
                models.Match.match_status == "Completed",
                (models.Match.player1_id == p1_id) | (models.Match.player2_id == p1_id)
            ).count() - p1_lb.wins)
            p1_lb.win_rate = p1_lb.wins / total_g if total_g > 0 else 0.0
            
        if p2_id:
            p2_lb = db.query(models.Leaderboard).filter(
                models.Leaderboard.player_id == p2_id,
                models.Leaderboard.tournament_id == db_match.tournament_id
            ).first()
            if p2_lb:
                p2_lb.points += p2_pts
                p2_lb.kills += db_match.player2_kills
                if p2_id == w_id:
                    p2_lb.wins += 1
                total_g = p2_lb.wins + (db.query(models.Match).filter(
                    models.Match.tournament_id == db_match.tournament_id,
                    models.Match.match_status == "Completed",
                    (models.Match.player1_id == p2_id) | (models.Match.player2_id == p2_id)
                ).count() - p2_lb.wins)
                p2_lb.win_rate = p2_lb.wins / total_g if total_g > 0 else 0.0
                
        # Send Notifications to contestants
        w_user = p1_user if w_id == p1_id else p2_user
        l_user = p2_user if w_id == p1_id else p1_user
        
        if w_user:
            await send_notification(
                db, 
                w_user.id, 
                "⚔️ Victory Achieved!", 
                f"You won your match against {l_user.name if l_user else 'AI/Bye'} in '{db_match.tournament.name}'! Earned +{50 + (db_match.player1_kills * 2 if w_id == p1_id else db_match.player2_kills * 2)} ranking points."
            )
        if l_user:
            await send_notification(
                db, 
                l_user.id, 
                "💀 Match Defeat", 
                f"You lost your match against {w_user.name} in '{db_match.tournament.name}'. Earned +{10 + (db_match.player2_kills * 2 if w_id == p1_id else db_match.player1_kills * 2)} ranking points."
            )
            
        # Recalculate ranks in this tournament
        all_lbs = db.query(models.Leaderboard).filter(
            models.Leaderboard.tournament_id == db_match.tournament_id
        ).order_by(models.Leaderboard.points.desc()).all()
        for idx, lb in enumerate(all_lbs):
            lb.rank = idx + 1
            
    db.commit()
    db.refresh(db_match)
    
    # Broadcast live match update
    await manager.broadcast({
        "type": "match_completed",
        "match_id": match_id,
        "tournament_id": db_match.tournament_id,
        "winner_id": db_match.winner_id
    })
    
    return db_match

@app.get("/matches", response_model=List[schemas.Match])
def get_matches(tournament_id: Optional[int] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Match)
    if tournament_id is not None:
        query = query.filter(models.Match.tournament_id == tournament_id)
    return query.all()

# Notifications Endpoints
@app.get("/notifications", response_model=List[schemas.Notification])
def get_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()

@app.patch("/notifications/{notification_id}/read", response_model=schemas.Notification)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not db_notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db_notif.is_read = True
    db.commit()
    db.refresh(db_notif)
    return db_notif

# Analytics Endpoint
@app.get("/analytics")
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

# Leaderboard Endpoints
@app.get("/leaderboard")
def get_global_leaderboard(db: Session = Depends(database.get_db)):
    users = db.query(models.User).filter(
        models.User.role == "player"
    ).order_by(models.User.ranking_points.desc()).all()
    
    return [{
        "player_id": u.id,
        "name": u.name,
        "avatar": u.avatar,
        "points": u.ranking_points,
        "wins": u.wins,
        "losses": u.losses,
        "kills": u.kills,
        "mvps": u.mvps,
        "achievements": u.achievements,
        "win_rate": (u.wins / (u.wins + u.losses)) if (u.wins + u.losses) > 0 else 0.0
    } for u in users]

@app.get("/leaderboard/weekly")
def get_weekly_leaderboard(db: Session = Depends(database.get_db)):
    week_ago = datetime.utcnow() - timedelta(days=7)
    results = db.query(
        models.User,
        func.sum(models.Leaderboard.points).label("total_points"),
        func.sum(models.Leaderboard.wins).label("total_wins"),
        func.sum(models.Leaderboard.kills).label("total_kills"),
        func.sum(models.Leaderboard.mvps).label("total_mvps"),
        func.avg(models.Leaderboard.win_rate).label("avg_win_rate")
    ).select_from(models.Leaderboard).join(models.Tournament).join(models.User, models.User.id == models.Leaderboard.player_id).filter(
        models.Tournament.match_day >= week_ago
    ).group_by(models.User.id).order_by(func.sum(models.Leaderboard.points).desc()).all()
    
    return [{
        "player_id": user.id,
        "name": user.name,
        "avatar": user.avatar,
        "points": pts or 0,
        "wins": wins or 0,
        "kills": kills or 0,
        "mvps": mvps or 0,
        "win_rate": wr or 0.0,
        "rank": idx + 1
    } for idx, (user, pts, wins, kills, mvps, wr) in enumerate(results)]

@app.get("/leaderboard/seasonal")
def get_seasonal_leaderboard(db: Session = Depends(database.get_db)):
    season_ago = datetime.utcnow() - timedelta(days=90)
    results = db.query(
        models.User,
        func.sum(models.Leaderboard.points).label("total_points"),
        func.sum(models.Leaderboard.wins).label("total_wins"),
        func.sum(models.Leaderboard.kills).label("total_kills"),
        func.sum(models.Leaderboard.mvps).label("total_mvps"),
        func.avg(models.Leaderboard.win_rate).label("avg_win_rate")
    ).select_from(models.Leaderboard).join(models.Tournament).join(models.User, models.User.id == models.Leaderboard.player_id).filter(
        models.Tournament.match_day >= season_ago
    ).group_by(models.User.id).order_by(func.sum(models.Leaderboard.points).desc()).all()
    
    return [{
        "player_id": user.id,
        "name": user.name,
        "avatar": user.avatar,
        "points": pts or 0,
        "wins": wins or 0,
        "kills": kills or 0,
        "mvps": mvps or 0,
        "win_rate": wr or 0.0,
        "rank": idx + 1
    } for idx, (user, pts, wins, kills, mvps, wr) in enumerate(results)]

@app.get("/leaderboard/{tournament_id}")
def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(database.get_db)):
    leaderboard = db.query(models.Leaderboard).filter(
        models.Leaderboard.tournament_id == tournament_id
    ).order_by(models.Leaderboard.points.desc()).all()
    
    results = []
    for l in leaderboard:
        results.append({
            "player_id": l.player_id,
            "name": l.player.name if l.player else "Unknown Operative",
            "avatar": l.player.avatar if l.player else None,
            "points": l.points,
            "wins": l.wins,
            "kills": l.kills,
            "mvps": l.mvps,
            "win_rate": l.win_rate,
            "rank": l.rank
        })
    return results

# --- ANTI-CHEAT & DISPUTE APIs ---

@app.post("/matches/{match_id}/dispute", response_model=schemas.Match)
def dispute_match(match_id: int, dispute: schemas.MatchDispute, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if db_match.player1_id != current_user.id and db_match.player2_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only dispute your own matches")
        
    db_match.disputed = True
    db_match.dispute_reason = dispute.reason
    db_match.match_status = "Disputed"
    db.commit()
    db.refresh(db_match)
    return db_match

@app.patch("/matches/{match_id}/resolve-dispute", response_model=schemas.Match)
def resolve_dispute(match_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    db_match.disputed = False
    db_match.dispute_reason = None
    db_match.match_status = "Completed"
    db.commit()
    db.refresh(db_match)
    return db_match

@app.patch("/users/{user_id}/unflag", response_model=schemas.User)
def unflag_user(user_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_flagged = False
    db.commit()
    db.refresh(user)
    return user

@app.get("/admin/disputes", response_model=List[schemas.Match])
def get_disputed_matches(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.Match).filter(models.Match.disputed == True).all()

@app.get("/admin/flagged_users", response_model=List[schemas.User])
def get_flagged_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.User).filter(models.User.is_flagged == True).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
