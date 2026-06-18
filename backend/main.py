from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import random
import asyncio
from datetime import timedelta, datetime
import auth
import schemas
from websockets_manager import manager
from discord_webhook import send_discord_notification
import communications
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from routers import analytics, ranking, battleroyale, clans, ai_engine, wallet, monetization, streaming, marketplace, lobby, audience, career, ai_assistant, automation, support, voice, social, recommendations
import models, database
import pyotp
import qrcode
import base64
import json
from io import BytesIO
from database import engine
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from limiter import limiter

import razorpay
import json
import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

razorpay_client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

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

app = FastAPI(title="Ultra Advanced eSports Platform")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
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

app.include_router(analytics.router)
app.include_router(ranking.router)
app.include_router(battleroyale.router)
app.include_router(clans.router)
app.include_router(ai_engine.router)
app.include_router(wallet.router)
app.include_router(monetization.router)
app.include_router(streaming.router)
app.include_router(marketplace.router)
app.include_router(lobby.router)
app.include_router(audience.router)
app.include_router(career.router)
app.include_router(ai_assistant.router)
app.include_router(automation.router)
app.include_router(support.router)
app.include_router(voice.router)
app.include_router(social.router)
app.include_router(recommendations.router)

async def automation_loop():
    import automation as auto_engine
    while True:
        try:
            with database.SessionLocal() as db:
                auto_engine.run_all_automation(db)
        except Exception as e:
            print(f"[Automation Error] {e}")
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(automation_loop())

# Authentication Endpoints
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None, db: Session = Depends(database.get_db)):
    user_id = None
    if token:
        try:
            user = auth.get_current_user(token=token, db=db)
            user_id = user.id
        except:
            pass

    if user_id:
        await manager.connect(websocket, user_id)
    else:
        # Fallback for anonymous users
        await websocket.accept()
        manager.active_connections[id(websocket)] = websocket
        
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed_data = json.loads(data)
                msg_type = parsed_data.get("type")
                
                if msg_type == "GET_STATUS":
                    online_users = manager.get_online_users()
                    await websocket.send_text(json.dumps({"type": "INITIAL_STATUS", "online_users": online_users}))
                
                elif msg_type in ["CHAT", "SUPER_CHAT", "LOBBY_CHAT"]:
                    await manager.broadcast(parsed_data)
                    
                elif msg_type == "DIRECT_MESSAGE":
                    receiver_id = parsed_data.get("receiver_id")
                    if receiver_id and user_id:
                        # Save to db
                        new_msg = models.DirectMessage(
                            sender_id=user_id,
                            receiver_id=receiver_id,
                            message=parsed_data.get("message")
                        )
                        db.add(new_msg)
                        db.commit()
                        db.refresh(new_msg)
                        
                        parsed_data["sender_id"] = user_id
                        parsed_data["id"] = new_msg.id
                        parsed_data["created_at"] = new_msg.created_at.isoformat()
                        
                        await manager.send_personal_message(parsed_data, receiver_id)
                        await manager.send_personal_message(parsed_data, user_id)

                elif msg_type in ["TYPING_START", "TYPING_STOP"]:
                    receiver_id = parsed_data.get("receiver_id")
                    if receiver_id and user_id:
                        parsed_data["sender_id"] = user_id
                        await manager.send_personal_message(parsed_data, receiver_id)

            except Exception as e:
                pass
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id)
            await manager.broadcast({"type": "STATUS", "user_id": user_id, "status": "offline"})
        else:
            if id(websocket) in manager.active_connections:
                del manager.active_connections[id(websocket)]

@app.post("/register", response_model=schemas.User)
@limiter.limit("5/minute")
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(database.get_db)):
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
    
    # Send welcome email
    communications.send_email(
        to=db_user.email,
        subject="Welcome to ULTRA ESPORTS!",
        body=f"Hello {db_user.name},\n\nWelcome to ULTRA ESPORTS. Get ready to compete and conquer!"
    )
    
    return db_user

@app.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not db_user or not auth.verify_password(form_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    fingerprint = "unknown"
    mfa_token = None
    if form_data.client_secret:
        try:
            secret_data = json.loads(form_data.client_secret)
            fingerprint = secret_data.get("fingerprint", "unknown")
            mfa_token = secret_data.get("mfa_token")
        except:
            pass

    # MFA Verification
    if db_user.mfa_enabled:
        if not mfa_token:
            raise HTTPException(status_code=401, detail="MFA_REQUIRED")
        totp = pyotp.TOTP(db_user.mfa_secret)
        if not totp.verify(mfa_token):
            raise HTTPException(status_code=401, detail="Invalid MFA token")

    # Device Trust Check
    trusted_device = db.query(models.TrustedDevice).filter(
        models.TrustedDevice.user_id == db_user.id,
        models.TrustedDevice.device_fingerprint == fingerprint
    ).first()

    user_agent = request.headers.get("User-Agent", "Unknown")
    ip_address = request.client.host

    if not trusted_device and fingerprint != "unknown":
        # New untrusted device detected
        new_device = models.TrustedDevice(
            user_id=db_user.id,
            device_fingerprint=fingerprint,
            device_name=user_agent[:250],
            ip_address=ip_address,
            is_trusted=True # We implicitly trust it after successful login for now
        )
        db.add(new_device)
        db.commit()
        
        # Send security alert email
        communications.send_email(
            to=db_user.email,
            subject="Security Alert: New Device Login",
            body=f"Hello {db_user.name},\n\nWe detected a login to your ULTRA ESPORTS account from a new device.\n\nIP: {ip_address}\nDevice: {user_agent}\n\nIf this was you, you can safely ignore this email. If you don't recognize this activity, please change your password immediately."
        )
    elif trusted_device:
        trusted_device.last_active = datetime.utcnow()
        trusted_device.ip_address = ip_address
        db.commit()

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}

@app.post("/auth/mfa/setup")
def setup_mfa(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled")
        
    secret = pyotp.random_base32()
    current_user.mfa_secret = secret
    db.commit()
    
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name="Ultra Esports")
    
    # Generate QR code
    qr = qrcode.make(provisioning_uri)
    buffered = BytesIO()
    qr.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_base64}"}

@app.post("/auth/mfa/verify-setup")
def verify_mfa_setup(
    data: dict, # expects {"token": "123456"}
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    totp = pyotp.TOTP(current_user.mfa_secret)
    if totp.verify(token):
        current_user.mfa_enabled = True
        db.commit()
        return {"status": "success", "message": "MFA enabled successfully"}
    
    raise HTTPException(status_code=400, detail="Invalid token")

@app.post("/auth/mfa/disable")
def disable_mfa(
    data: dict, # expects {"token": "123456"}
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    totp = pyotp.TOTP(current_user.mfa_secret)
    if totp.verify(token):
        current_user.mfa_enabled = False
        current_user.mfa_secret = None
        db.commit()
        return {"status": "success", "message": "MFA disabled successfully"}
    
    raise HTTPException(status_code=400, detail="Invalid token")

@app.get("/profile", response_model=schemas.User)
def get_profile(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    higher_ranked = db.query(models.User).filter(models.User.ranking_points > current_user.ranking_points).count()
    current_user.rank = higher_ranked + 1
    return current_user

@app.get("/users/{user_id}", response_model=schemas.User)
def get_public_profile(
    user_id: int,
    db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    higher_ranked = db.query(models.User).filter(models.User.ranking_points > user.ranking_points).count()
    user.rank = higher_ranked + 1
    return user

@app.patch("/profile/edit", response_model=schemas.User)
def edit_profile(
    user_update: schemas.UserUpdate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    
    higher_ranked = db.query(models.User).filter(models.User.ranking_points > current_user.ranking_points).count()
    current_user.rank = higher_ranked + 1
    return current_user

@app.patch("/profile/payout-upi")
def update_payout_upi(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    payout_upi_id = data.get("payout_upi_id")
    if not payout_upi_id:
        raise HTTPException(status_code=400, detail="payout_upi_id is required")
    current_user.payout_upi_id = payout_upi_id
    db.commit()
    return {"detail": "Payout UPI ID configured successfully"}

class TwitchUpdate(BaseModel):
    twitch_username: str

@app.put("/profile/twitch")
def update_twitch_username(
    data: TwitchUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    current_user.twitch_username = data.twitch_username
    db.commit()
    return {"status": "success", "twitch_username": current_user.twitch_username}

@app.post("/upgrade-premium")
def upgrade_premium(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.is_premium:
        raise HTTPException(status_code=400, detail="Already a premium user.")
    if current_user.wallet_balance < 1000:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance. ₹1000 required.")
    
    current_user.wallet_balance -= 1000
    current_user.is_premium = True
    
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if admin:
        admin.wallet_balance += 1000
        
    db.commit()
    db.refresh(current_user)
    
    return {"detail": "Upgraded to Premium successfully!"}

@app.post("/upgrade-premium-razorpay")
def upgrade_premium_razorpay(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.is_premium:
        raise HTTPException(status_code=400, detail="Already a premium user.")
    
    try:
        order_amount = 100000 # ₹1000 in paise
        order_currency = 'INR'
        order_receipt = f'order_rcptid_{current_user.id}'
        
        razorpay_order = razorpay_client.order.create(dict(amount=order_amount, currency=order_currency, receipt=order_receipt))
        return {
            "order_id": razorpay_order['id'],
            "amount": order_amount,
            "currency": order_currency,
            "key_id": os.getenv("RAZORPAY_KEY_ID")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Razorpay error: {str(e)}")

@app.post("/verify-premium-razorpay")
def verify_premium_payment(data: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        if current_user.is_premium:
            return {"detail": "Already upgraded to Premium."}
            
        current_user.is_premium = True
        
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if admin:
            admin.wallet_balance += 1000.0
            
        db.commit()
        return {"detail": "Premium upgrade verified successfully!"}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature verification failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/admin/finance-stats")
def get_finance_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Calculate premium revenue
    premium_players = db.query(models.User).filter(models.User.is_premium == True, models.User.role == "player").count()
    premium_revenue = premium_players * 1000
    
    # Calculate superchat revenue
    superchats = db.query(models.Superchat).all()
    superchat_revenue = sum(sc.amount for sc in superchats)
    
    # Calculate registration revenue
    regs = db.query(models.Registration, models.Tournament).join(models.Tournament).filter(models.Registration.registration_status == "Approved").all()
    registration_revenue = sum(t.entry_fee for r, t in regs)
    
    # Calculate match revenue (from ongoing and completed matches joining fees)
    active_matches = db.query(models.Match, models.Tournament).join(models.Tournament).filter(models.Match.match_status.in_(["Ongoing", "Completed"])).all()
    match_revenue = sum(t.entry_fee * 2 for m, t in active_matches)
    
    return {
        "premium_revenue": premium_revenue,
        "superchat_revenue": superchat_revenue,
        "registration_revenue": registration_revenue,
        "match_revenue": match_revenue,
        "total_wallet_balance": current_user.wallet_balance
    }

@app.post("/admin/payout")
def send_payout(
    payout_data: schemas.PayoutRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if current_user.wallet_balance < payout_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient Admin Wallet balance for payout")
        
    player = db.query(models.User).filter(models.User.email == payout_data.email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    target_upi = payout_data.upi_id or player.payout_upi_id
    if not target_upi:
        raise HTTPException(status_code=400, detail="Player has not configured a Payout UPI ID and none was provided.")
        
    try:
        # Mock RazorpayX Payout since real payouts require RazorpayX approval and complex setup
        # In production this would use razorpay_client.payout.create()
        transfer_id = f"payout_simulated_{payout_data.amount}"
        
        current_user.wallet_balance -= payout_data.amount
        db.commit()
        return {"detail": f"Razorpay Payout of ₹{payout_data.amount} successfully sent to {player.name} via UPI ({target_upi})"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Razorpay Payout failed: {str(e)}")

@app.get("/admin/recent-winners")
def get_recent_winners(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    recent_matches = db.query(models.Match).filter(
        models.Match.match_status == "Completed",
        models.Match.winner_id != None
    ).order_by(models.Match.id.desc()).limit(10).all()
    
    winners = []
    for match in recent_matches:
        winner = db.query(models.User).filter(models.User.id == match.winner_id).first()
        tournament = db.query(models.Tournament).filter(models.Tournament.id == match.tournament_id).first()
        if winner and tournament:
            winners.append({
                "match_id": match.id,
                "tournament_name": tournament.name,
                "winner_name": winner.name,
                "winner_email": winner.email,
                "winner_upi": winner.payout_upi_id,
                "prize": tournament.prize_pool
            })
    
    return winners

# Tournament Endpoints
@app.get("/tournaments", response_model=List[schemas.Tournament])
def get_tournaments(db: Session = Depends(database.get_db)):
    tournaments = db.query(models.Tournament).all()
    now = datetime.now()
    
    for t in tournaments:
        if t.status not in ["Completed", "Cancelled", "Ongoing"]:
            if t.match_day:
                if t.reg_start and t.reg_end and t.reg_start <= now <= t.reg_end:
                    if t.status != "Registration Open":
                        t.status = "Registration Open"
                elif t.reg_end and now > t.reg_end:
                    time_until_match = t.match_day - now if t.match_day else None
                    if time_until_match and time_until_match.total_seconds() > 2 * 24 * 3600:
                        if t.status != "Upcoming":
                            t.status = "Upcoming"
                    else:
                        if t.status != "Registration Closed":
                            t.status = "Registration Closed"
                else:
                    if t.status != "Upcoming":
                        t.status = "Upcoming"
    
    db.commit()
    return tournaments

@app.get("/tournaments/{tournament_id}/approved-players", response_model=List[schemas.User])
def get_tournament_approved_players(tournament_id: int, db: Session = Depends(database.get_db)):
    regs = db.query(models.Registration).filter(
        models.Registration.tournament_id == tournament_id,
        models.Registration.registration_status == "Approved"
    ).all()
    # Filter out admins from the public list
    return [r.user for r in regs if r.user.role != "admin"]

@app.post("/tournaments", response_model=schemas.Tournament)
def create_tournament(
    tournament: schemas.TournamentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_tournament = models.Tournament(**tournament.dict())
    
    # Enforce 1-week registration window
    from datetime import datetime, timedelta
    if not db_tournament.reg_start:
        db_tournament.reg_start = datetime.now()
    db_tournament.reg_end = db_tournament.reg_start + timedelta(days=7)
    db.add(db_tournament)
    db.commit()
    db.refresh(db_tournament)
    background_tasks.add_task(manager.broadcast, {"type": "NEW_TOURNAMENT", "message": f"New Tournament Created: {db_tournament.name}"})
    return db_tournament

@app.patch("/tournaments/{tournament_id}", response_model=schemas.Tournament)
def update_tournament(
    tournament_id: int,
    tournament_update: schemas.TournamentUpdate,
    background_tasks: BackgroundTasks,
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
    background_tasks.add_task(manager.broadcast, {"type": "REFRESH_TOURNAMENTS"})
    return db_tournament

@app.delete("/tournaments/{tournament_id}")
def delete_tournament(
    tournament_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not db_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Reset Team associations
    db.query(models.Team).filter(models.Team.tournament_id == tournament_id).update({"tournament_id": None}, synchronize_session=False)
    
    # Delete related dependencies first to prevent Foreign Key constraint violations
    db.query(models.Leaderboard).filter(models.Leaderboard.tournament_id == tournament_id).delete(synchronize_session=False)
    db.query(models.Registration).filter(models.Registration.tournament_id == tournament_id).delete(synchronize_session=False)
    
    # Cascade delete matches and their children
    matches = db.query(models.Match).filter(models.Match.tournament_id == tournament_id).all()
    match_ids = [m.id for m in matches]
    if match_ids:
        db.query(models.MatchParticipant).filter(models.MatchParticipant.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.AIPrediction).filter(models.AIPrediction.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.AntiCheatFlag).filter(models.AntiCheatFlag.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.Stream).filter(models.Stream.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.Commentary).filter(models.Commentary.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.MatchClip).filter(models.MatchClip.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.HighlightTimeline).filter(models.HighlightTimeline.match_id.in_(match_ids)).delete(synchronize_session=False)
        db.query(models.Match).filter(models.Match.tournament_id == tournament_id).delete(synchronize_session=False)
    
    db.delete(db_tournament)
    db.commit()
    background_tasks.add_task(manager.broadcast, {"type": "REFRESH_TOURNAMENTS"})
    return {"detail": "Tournament deleted"}

# Registration Endpoints
@app.post("/register-tournament")
async def register_for_tournament(
    reg_data: schemas.RegistrationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "player" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only players can register for tournaments")
        
    if not current_user.is_premium and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Need premium for joining")
    
    # 1. Check if tournament exists
    tournament = db.query(models.Tournament).filter(models.Tournament.id == reg_data.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=444, detail="Tournament not found")
        
    # 2. Prevent invalid joins
    if tournament.status not in ["Upcoming", "Registration Open"]:
        raise HTTPException(status_code=400, detail=f"Cannot join tournament. Registration is {tournament.status.lower()}")

    if tournament.match_type == "Squad":
        if not reg_data.team_id:
            raise HTTPException(status_code=400, detail="A team is required for squad tournaments")
        team = db.query(models.Team).filter(models.Team.id == reg_data.team_id).first()
        if not team:
            raise HTTPException(status_code=400, detail="Team not found")
        if team.captain_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the team captain can register the squad for a tournament")
            
        existing = db.query(models.Registration).filter(
            models.Registration.team_id == team.id,
            models.Registration.tournament_id == reg_data.tournament_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Your squad is already registered for this tournament")
    else:
        existing = db.query(models.Registration).filter(
            models.Registration.user_id == current_user.id,
            models.Registration.tournament_id == reg_data.tournament_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You are already registered for this tournament")
        
    # 4. Enforce limits
    current_regs_count = db.query(models.Registration).filter(
        models.Registration.tournament_id == reg_data.tournament_id,
        models.Registration.registration_status != "Rejected"
    ).count()
    
    capacity_limit = tournament.max_players if tournament.match_type != "Squad" else tournament.max_players // (tournament.team_size or 4)
    
    if current_regs_count >= capacity_limit:
        new_reg = models.Registration(
            user_id=current_user.id,
            tournament_id=reg_data.tournament_id,
            registration_status="Rejected"
        )
        db.add(new_reg)
        db.commit()
        raise HTTPException(status_code=400, detail="This tournament is currently at maximum capacity. Your request has been automatically rejected.")
    if tournament.entry_fee > 0:
        if current_user.wallet_balance < tournament.entry_fee:
            raise HTTPException(status_code=402, detail="Insufficient wallet balance. Please deposit funds.")
        current_user.wallet_balance -= tournament.entry_fee
        
        # Log Entry Fee Transaction
        tx = models.Transaction(
            user_id=current_user.id,
            amount=-tournament.entry_fee,
            currency=tournament.currency,
            transaction_type="Entry_Fee",
            status="Completed",
            reference_id=str(tournament.id)
        )
        db.add(tx)
        
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if admin:
            admin.wallet_balance += tournament.entry_fee
        
    new_reg = models.Registration(
        user_id=current_user.id,
        team_id=reg_data.team_id if tournament.match_type == "Squad" else None,
        tournament_id=reg_data.tournament_id,
        registration_status="Approved"
    )
    db.add(new_reg)
    
    # Initialize leaderboard entry immediately since it's approved
    if tournament.match_type == "Squad":
        members = db.query(models.TeamMember).filter(models.TeamMember.team_id == reg_data.team_id).all()
        for m in members:
            new_lb = models.Leaderboard(
                player_id=m.user_id,
                tournament_id=reg_data.tournament_id,
                points=0, wins=0, kills=0, mvps=0, win_rate=0.0
            )
            db.add(new_lb)
    else:
        new_lb = models.Leaderboard(
            player_id=current_user.id,
            tournament_id=reg_data.tournament_id,
            points=0, wins=0, kills=0, mvps=0, win_rate=0.0
        )
        db.add(new_lb)
    
    db.commit()
    db.refresh(new_reg)
    
    # Real-time Communication Dispatch
    email_body = f"Congratulations {current_user.name}!\n\nYour registration for {tournament.name} has been officially approved. Prepare for battle.\n\nGLHF,\nUltra Esports Cyber Command"
    background_tasks.add_task(communications.send_email, to=current_user.email, subject=f"Registration Approved: {tournament.name}", body=email_body)
    
    if current_user.mobile_no:
        msg = f"ULTRA ESPORTS ALERT: Your registration for '{tournament.name}' is approved! Welcome to the battleground."
        background_tasks.add_task(communications.send_sms, to=current_user.mobile_no, message=msg)
        background_tasks.add_task(communications.send_whatsapp, to=current_user.mobile_no, message=msg)
        
    # Portal Notification
    new_notification = models.Notification(
        user_id=current_user.id,
        title="Registration Approved",
        message=f"Your registration for {tournament.name} has been approved."
    )
    db.add(new_notification)
    db.commit()
    
    import asyncio
    asyncio.create_task(manager.broadcast({"type": "REFRESH_REGISTRATIONS"}))

    return {
        "id": new_reg.id,
        "tournament_id": new_reg.tournament_id,
        "user_id": new_reg.user_id,
        "registration_status": new_reg.registration_status,
        "checkout_url": None
    }



@app.get("/my-tournaments")
def get_my_tournaments(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.role != "player":
        raise HTTPException(status_code=403, detail="Not a player")
        
    team_ids = [tm.team_id for tm in db.query(models.TeamMember).filter(models.TeamMember.user_id == current_user.id).all()]
    
    regs = db.query(models.Registration).filter(
        (models.Registration.user_id == current_user.id) | (models.Registration.team_id.in_(team_ids)),
        models.Registration.registration_status == "Approved"
    ).all()
    return [r.tournament for r in regs]

@app.get("/my-registrations")
def get_my_registrations(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.role != "player":
        return []
        
    team_ids = [tm.team_id for tm in db.query(models.TeamMember).filter(models.TeamMember.user_id == current_user.id).all()]
    
    regs = db.query(models.Registration).filter(
        (models.Registration.user_id == current_user.id) | (models.Registration.team_id.in_(team_ids))
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
    background_tasks: BackgroundTasks,
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
            
        # Real-time Communication Dispatch
        user = db.query(models.User).filter(models.User.id == db_reg.user_id).first()
        tournament = db.query(models.Tournament).filter(models.Tournament.id == db_reg.tournament_id).first()
        
        if user and tournament:
            # 1. Email
            email_body = f"Congratulations {user.name}!\n\nYour registration for {tournament.name} has been officially approved. Prepare for battle.\n\nGLHF,\nUltra Esports Cyber Command"
            background_tasks.add_task(communications.send_email, to=user.email, subject=f"Registration Approved: {tournament.name}", body=email_body)
            
            # 2. SMS & WhatsApp
            if user.mobile_no:
                msg = f"ULTRA ESPORTS ALERT: Your registration for '{tournament.name}' is approved! Welcome to the battleground."
                background_tasks.add_task(communications.send_sms, to=user.mobile_no, message=msg)
                background_tasks.add_task(communications.send_whatsapp, to=user.mobile_no, message=msg)
                
            # 3. Portal Notification
            new_notification = models.Notification(
                user_id=user.id,
                title="Registration Approved",
                message=f"Your registration for {tournament.name} has been approved."
            )
            db.add(new_notification)
            
    db.commit()
    db.refresh(db_reg)
    
    # Dispatch real-time DB notification and push WS update to the player
    title = f"Registration {new_status}!"
    message = f"Your registration request for '{db_reg.tournament.name}' has been {new_status.lower()}."
    await send_notification(db, db_reg.user_id, title, message)
    
    import asyncio
    asyncio.create_task(manager.broadcast({"type": "REFRESH_REGISTRATIONS"}))
    asyncio.create_task(manager.broadcast({"type": "REFRESH_TOURNAMENTS"}))
    
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

@app.post("/admin/tournaments/{tournament_id}/simulate")
async def simulate_tournament_bracket(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    import automation
    # Simulate matches manually bypassing the 15-minute wait
    active_matches = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.match_status.in_(["Scheduled", "Ongoing"])
    ).all()
    
    import random
    count = 0
    for m in active_matches:
        if m.player1_id and m.player2_id:
            m.player1_score = random.randint(10, 100)
            m.player2_score = random.randint(10, 100)
            if m.player1_score == m.player2_score:
                m.player1_score += 1
            m.winner_id = m.player1_id if m.player1_score > m.player2_score else m.player2_id
            m.scores = f"{m.player1_score} - {m.player2_score}"
            m.match_status = "Completed"
            
            # End associated streams
            active_streams = db.query(models.Stream).filter(models.Stream.match_id == m.id).all()
            for stream in active_streams:
                stream.is_live = False
                
            automation.log_event(f"Admin Manually Simulated Match #{m.id} in Tournament #{m.tournament_id}")
            count += 1
    
    if count > 0:
        db.commit()
        # Force progress tournament to next round
        automation.auto_progress_tournaments(db)
        
    return {"detail": f"Simulated {count} active matches and progressed tournament bracket."}

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
        
    existing_matches = db.query(models.Match).filter(models.Match.tournament_id == tournament_id).first()
    if existing_matches:
        raise HTTPException(status_code=400, detail="Matches have already been scheduled for this tournament")

    scheduled_matches = []
    if tournament.match_type == "Squad":
        teams = [r.team for r in regs if r.team]
        random.shuffle(teams)
        i = 0
        while i < len(teams):
            if i + 1 < len(teams):
                new_match = models.Match(
                    tournament_id=tournament_id,
                    team1_id=teams[i].id,
                    team2_id=teams[i+1].id,
                    match_status="Scheduled",
                    round=1,
                    team1_score=0,
                    team2_score=0
                )
                db.add(new_match)
                scheduled_matches.append(new_match)
                i += 2
            else:
                bye_match = models.Match(
                    tournament_id=tournament_id,
                    team1_id=teams[i].id,
                    team2_id=None,
                    match_status="Completed",
                    winner_team_id=teams[i].id,
                    round=1,
                    scores="Bye",
                    team1_score=1,
                    team2_score=0
                )
                db.add(bye_match)
                scheduled_matches.append(bye_match)
                i += 1
    else:
        players = [r.user for r in regs if r.user]
        random.shuffle(players)
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
        # If no matches exist, just schedule round 1!
        return await generate_tournament_schedule(tournament_id, db, current_user)
        
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
    if tournament.match_type == "Squad":
        for m in winners_matches:
            if m.winner_team_id:
                w_team = db.query(models.Team).filter(models.Team.id == m.winner_team_id).first()
                if w_team: winners.append(w_team)
    else:
        for m in winners_matches:
            if m.winner_id:
                w_user = db.query(models.User).filter(models.User.id == m.winner_id).first()
                if w_user: winners.append(w_user)
                
    if len(winners) <= 1:
        if len(winners) == 1:
            tournament.status = "Completed"
            champion = winners[0]
            
            if tournament.match_type == "Squad":
                # Distribute prize pool to captain or team members
                if tournament.prize_pool > 0 and champion.captain:
                    champion.captain.wallet_balance += tournament.prize_pool
                db.commit()
                # Notify members
                members = db.query(models.TeamMember).filter(models.TeamMember.team_id == champion.id).all()
                for mem in members:
                    await send_notification(db, mem.user_id, "🏆 Tournament Champion!", f"Your squad '{champion.name}' won '{tournament.name}'!")
                await manager.broadcast({"type": "tournament_completed", "tournament_id": tournament_id, "champion_team_id": champion.id})
                return {"detail": "Tournament completed! Champion squad declared.", "champion": champion.name}
            else:
                if tournament.prize_pool > 0:
                    champion.wallet_balance += tournament.prize_pool
                db.commit()
                await send_notification(db, champion.id, "🏆 Tournament Champion!", f"You won '{tournament.name}'!")
                await manager.broadcast({"type": "tournament_completed", "tournament_id": tournament_id, "champion_id": champion.id})
                return {"detail": "Tournament completed! Champion declared.", "champion": champion.name}
        else:
            raise HTTPException(status_code=400, detail="No winners found in the current round")
            
    next_round = current_round + 1
    scheduled_matches = []
    random.shuffle(winners)
    
    if len(winners) == 3:
        # TRIPLE THREAT FINALE!
        triple_match = models.Match(
            tournament_id=tournament_id,
            player1_id=winners[0].id,
            player2_id=winners[1].id,
            player3_id=winners[2].id,
            match_status="Scheduled",
            round=next_round,
            player1_score=0,
            player2_score=0,
            player3_score=0,
            player1_kills=0,
            player2_kills=0,
            player3_kills=0
        )
        db.add(triple_match)
        scheduled_matches.append(triple_match)
    else:
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
                # Odd winner out - Must play against the AI Enforcer!
                bot = db.query(models.User).filter(models.User.email == "ai_enforcer@uaep.com").first()
                if not bot:
                    bot = models.User(
                        name="AI Enforcer [BOT]",
                        email="ai_enforcer@uaep.com",
                        role="player",
                        is_premium=False,
                        ranking_points=100,
                        mmr=1200.0
                    )
                    db.add(bot)
                    db.commit()
                    db.refresh(bot)
                    
                ai_match = models.Match(
                    tournament_id=tournament_id,
                    player1_id=winners[i].id,
                    player2_id=bot.id,
                    match_status="Scheduled",
                    round=next_round,
                    player1_score=0,
                    player2_score=0
                )
                db.add(ai_match)
                scheduled_matches.append(ai_match)
                i += 1
            
    db.commit()
    
    # Notify players
    for match in scheduled_matches:
        db.refresh(match)
        if match.player1_id:
            await send_notification(db, match.player1_id, "Advanced to Next Round!", f"You advanced to Round {next_round}!")
        if match.player2_id:
            await send_notification(db, match.player2_id, "Advanced to Next Round!", f"You advanced to Round {next_round}!")
        if match.team1_id:
            mems = db.query(models.TeamMember).filter(models.TeamMember.team_id == match.team1_id).all()
            for mem in mems: await send_notification(db, mem.user_id, "Squad Advanced!", f"Your squad advanced to Round {next_round}!")
        if match.team2_id:
            mems = db.query(models.TeamMember).filter(models.TeamMember.team_id == match.team2_id).all()
            for mem in mems: await send_notification(db, mem.user_id, "Squad Advanced!", f"Your squad advanced to Round {next_round}!")
            
    await manager.broadcast({"type": "next_round_scheduled", "tournament_id": tournament_id, "round": next_round})
    return {"detail": f"Round {next_round} matches scheduled successfully", "matches_count": len(scheduled_matches)}

@app.get("/matches/{match_id}/simulate-scores")
def simulate_match_scores(
    match_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if db_match.tournament.match_type == "Squad":
        team1 = db.query(models.Team).filter(models.Team.id == db_match.team1_id).first()
        team2 = db.query(models.Team).filter(models.Team.id == db_match.team2_id).first()
        if not team1 or not team2:
            raise HTTPException(status_code=400, detail="Squad match must have two teams to simulate")
        t1_score = __import__('random').randint(5, 13)
        t2_score = __import__('random').randint(1, 12)
        if t1_score == t2_score: t1_score += 1
        return {"team1_score": t1_score, "team2_score": t2_score}

    p1 = db.query(models.User).filter(models.User.id == db_match.player1_id).first()
    p2 = db.query(models.User).filter(models.User.id == db_match.player2_id).first()
    p3 = db.query(models.User).filter(models.User.id == db_match.player3_id).first() if db_match.player3_id else None
    
    if not p1 or not p2:
        raise HTTPException(status_code=400, detail="Match must have at least two players to simulate scores")

    def calc_power(player):
        return (player.ranking_points * 0.5) + (player.wins * 10) + (player.kills * 2) + (player.mvps * 15)

    players = [(1, p1), (2, p2)]
    if p3: players.append((3, p3))
    
    effective_powers = {}
    for pid, p in players:
        pwr = calc_power(p) * random.uniform(0.8, 1.2)
        effective_powers[pid] = max(pwr, 1.0)
        
    sorted_players = sorted(effective_powers.items(), key=lambda x: x[1], reverse=True)
    
    scores = {1: 0, 2: 0, 3: 0}
    kills = {1: 0, 2: 0, 3: 0}
    
    # 1st place gets 13
    first_id, first_pwr = sorted_players[0]
    scores[first_id] = 13
    kills[first_id] = random.randint(15, 30)
    
    # 2nd place
    second_id, second_pwr = sorted_players[1]
    scores[second_id] = min(int(13 * (second_pwr / first_pwr)), 12)
    kills[second_id] = random.randint(5, 20)
    
    # 3rd place (if exists)
    if p3:
        third_id, third_pwr = sorted_players[2]
        scores[third_id] = min(int(13 * (third_pwr / first_pwr)), 12)
        if scores[third_id] == scores[second_id]:
            scores[third_id] = max(0, scores[third_id] - 1)
        kills[third_id] = random.randint(1, 15)
        
    return {
        "player1_score": scores[1],
        "player2_score": scores[2],
        "player3_score": scores[3],
        "player1_kills": kills[1],
        "player2_kills": kills[2],
        "player3_kills": kills[3]
    }

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
        
    if match_update.player1_score is not None: db_match.player1_score = match_update.player1_score
    if match_update.player2_score is not None: db_match.player2_score = match_update.player2_score
    if match_update.player3_score is not None: db_match.player3_score = match_update.player3_score
    if match_update.team1_score is not None: db_match.team1_score = match_update.team1_score
    if match_update.team2_score is not None: db_match.team2_score = match_update.team2_score
    if match_update.player1_kills is not None: db_match.player1_kills = match_update.player1_kills
    if match_update.player2_kills is not None: db_match.player2_kills = match_update.player2_kills
    if match_update.player3_kills is not None: db_match.player3_kills = match_update.player3_kills
    if match_update.winner_id is not None: db_match.winner_id = match_update.winner_id
    if match_update.winner_team_id is not None: db_match.winner_team_id = match_update.winner_team_id
    if match_update.scores is not None: db_match.scores = match_update.scores
        
    old_status = db_match.match_status
    if match_update.match_status is not None:
        db_match.match_status = match_update.match_status

    if db_match.match_status == "Completed" and old_status != "Completed":
        is_squad = db_match.tournament.match_type == "Squad"
        if is_squad:
            if not db_match.winner_team_id and db_match.team2_id is not None:
                if db_match.team1_score >= db_match.team2_score: db_match.winner_team_id = db_match.team1_id
                else: db_match.winner_team_id = db_match.team2_id
                
            winning_team_id = db_match.winner_team_id
            teams = [db_match.team1_id, db_match.team2_id]
            for tid in teams:
                if not tid: continue
                is_win = (tid == winning_team_id)
                team_members = db.query(models.TeamMember).filter(models.TeamMember.team_id == tid).all()
                
                for m in team_members:
                    user = db.query(models.User).filter(models.User.id == m.user_id).first()
                    if not user: continue
                    pts = 50 if is_win else 10
                    simulated_kills = __import__('random').randint(1, 8) if is_win else __import__('random').randint(0, 3)
                    pts += simulated_kills * 2
                    
                    user.ranking_points += pts
                    user.kills += simulated_kills
                    if is_win: user.wins += 1
                    else: user.losses += 1
                    
                    lb = db.query(models.Leaderboard).filter(models.Leaderboard.player_id == user.id, models.Leaderboard.tournament_id == db_match.tournament_id).first()
                    if lb:
                        lb.points += pts
                        lb.kills += simulated_kills
                        if is_win: lb.wins += 1
                        lb.win_rate = (lb.wins / (lb.wins + lb.losses)) if hasattr(lb, 'losses') else (lb.wins / (lb.wins + 1))
                    
                    if is_win:
                        __import__('asyncio').create_task(send_notification(db, user.id, "Squad Victory!", f"Your squad won a match in '{db_match.tournament.name}'! Earned +{pts} points."))
                    else:
                        __import__('asyncio').create_task(send_notification(db, user.id, "Squad Defeat", f"Your squad was eliminated from '{db_match.tournament.name}'."))
            
            if winning_team_id:
                w_team = db.query(models.Team).filter(models.Team.id == winning_team_id).first()
                winner_name = w_team.name if w_team else "Team"
                __import__('asyncio').create_task(manager.broadcast({"type": "MATCH_RESULT", "message": f"Match completed in '{db_match.tournament.name}': Squad {winner_name} wins!"}))
        else:
            winner_id = db_match.winner_id
            if not winner_id and db_match.player2_id is not None:
                players_stats = [
                    (db_match.player1_id, db_match.player1_score, db_match.player1_kills),
                    (db_match.player2_id, db_match.player2_score, db_match.player2_kills)
                ]
                if db_match.player3_id is not None:
                    players_stats.append((db_match.player3_id, db_match.player3_score, db_match.player3_kills))
                    
                players_stats.sort(key=lambda x: (x[1], x[2]), reverse=True)
                winner_id = players_stats[0][0]
                db_match.winner_id = winner_id

            p_stats = []
            if db_match.player1_id: p_stats.append((db_match.player1_id, db_match.player1_score, db_match.player1_kills))
            if db_match.player2_id: p_stats.append((db_match.player2_id, db_match.player2_score, db_match.player2_kills))
            if db_match.player3_id: p_stats.append((db_match.player3_id, db_match.player3_score, db_match.player3_kills))
            
            p_stats.sort(key=lambda x: (x[1], x[2]), reverse=True)
            
            for idx, p in enumerate(p_stats):
                pid, score, kills = p
                user = db.query(models.User).filter(models.User.id == pid).first()
                if not user: continue
                
                if len(p_stats) == 3: pts = 50 if idx == 0 else 20 if idx == 1 else 10
                else: pts = 50 if idx == 0 else 10
                pts += kills * 2
                
                user.ranking_points += pts
                user.kills += kills
                
                if idx == 0: user.wins += 1
                else: user.losses += 1
                
                if user.wins == 1 and not (user.achievements and "First Blood" in user.achievements): user.achievements = (user.achievements + ",First Blood") if user.achievements else "First Blood"
                if user.kills >= 50 and not (user.achievements and "Sharpshooter" in user.achievements): user.achievements = (user.achievements + ",Sharpshooter") if user.achievements else "Sharpshooter"
                if user.wins >= 10 and not (user.achievements and "Gladiator" in user.achievements): user.achievements = (user.achievements + ",Gladiator") if user.achievements else "Gladiator"
                
                p_total = user.wins + user.losses
                p_wr = user.wins / p_total if p_total > 0 else 0
                if (p_total > 5 and p_wr > 0.90) or kills > 40: user.is_flagged = True
                
                lb = db.query(models.Leaderboard).filter(models.Leaderboard.player_id == pid, models.Leaderboard.tournament_id == db_match.tournament_id).first()
                if lb:
                    lb.points += pts
                    lb.kills += kills
                    if idx == 0: lb.wins += 1
                    lb.win_rate = (lb.wins / (lb.wins + lb.losses)) if hasattr(lb, 'losses') else (lb.wins / (lb.wins + 1))
                
                if idx == 0:
                    user.mvps += 1
                    if lb: lb.mvps += 1
                    __import__('asyncio').create_task(send_notification(db, user.id, "⚔️ Victory Achieved!", f"You won your match in '{db_match.tournament.name}'! Earned +{pts} ranking points."))
                else:
                    __import__('asyncio').create_task(send_notification(db, user.id, "💀 Match Defeat", f"You lost your match in '{db_match.tournament.name}'. Earned +{pts} ranking points."))
                    
            if winner_id:
                winner = db.query(models.User).filter(models.User.id == winner_id).first()
                winner_name = winner.name if winner else "Player"
                __import__('asyncio').create_task(manager.broadcast({"type": "MATCH_RESULT", "message": f"Match completed in '{db_match.tournament.name}': {winner_name} wins!"}))
                
        # Recalculate ranks
        all_lbs = db.query(models.Leaderboard).filter(models.Leaderboard.tournament_id == db_match.tournament_id).order_by(models.Leaderboard.points.desc()).all()
        for idx, lb in enumerate(all_lbs):
            lb.rank = idx + 1
            
        # Optional: check if tournament should auto-complete based on matches (omitted complex logic)

    db.commit()
    db.refresh(db_match)
    return db_match
@app.post("/tournaments/{tournament_id}/auto-resolve-round")
async def auto_resolve_round(
    tournament_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    ongoing_matches = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.match_status.in_(["Ongoing", "Scheduled"])
    ).all()
    
    if not ongoing_matches:
        raise HTTPException(status_code=400, detail="No ongoing or scheduled matches found to resolve.")
        
    resolved_count = 0
    for m in ongoing_matches:
        is_squad = m.tournament.match_type == "Squad"
        if is_squad:
            if not m.team2_id:
                update = schemas.MatchUpdate(
                    match_status="Completed", scores="Bye", winner_team_id=m.team1_id,
                    team1_score=1, team2_score=0
                )
            else:
                sim = simulate_match_scores(m.id, db, current_user)
                update = schemas.MatchUpdate(
                    match_status="Completed",
                    team1_score=sim["team1_score"], team2_score=sim["team2_score"]
                )
        else:
            if not m.player2_id:
                update = schemas.MatchUpdate(
                    match_status="Completed", scores="Bye", winner_id=m.player1_id,
                    player1_score=1, player2_score=0, player1_kills=0, player2_kills=0
                )
            else:
                sim = simulate_match_scores(m.id, db, current_user)
                update = schemas.MatchUpdate(
                    match_status="Completed",
                    player1_score=sim["player1_score"], player2_score=sim["player2_score"],
                    player1_kills=sim["player1_kills"], player2_kills=sim["player2_kills"]
                )
        await update_match_result(m.id, update, db, current_user)
        resolved_count += 1
        
    return {"detail": f"AI Auto-Resolved {resolved_count} matches"}

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

# Analytics Endpoint Extracted to routers/analytics.py

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

class DisputeResolve(BaseModel):
    action: str # "approve" or "dismiss"

@app.patch("/matches/{match_id}/resolve-dispute", response_model=schemas.Match)
def resolve_dispute(match_id: int, payload: DisputeResolve, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    db_match.disputed = False
    db_match.dispute_reason = None
    
    if payload.action == "approve":
        db_match.match_status = "Cancelled"
    elif payload.action == "dismiss":
        db_match.match_status = "Completed"
        # End associated streams
        active_streams = db.query(models.Stream).filter(models.Stream.match_id == match_id).all()
        for stream in active_streams:
            stream.is_live = False
    else:
        raise HTTPException(status_code=400, detail="Action must be approve or dismiss")
        
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

@app.get("/admin/disputes")
def get_disputes(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.Match).filter(models.Match.match_status == "Disputed").all()

class MMRUpdate(BaseModel):
    mmr: float

@app.patch("/admin/users/{user_id}/ban")
def ban_user(user_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "banned"
    db.commit()
    return {"detail": f"User {user.email} banned successfully."}

@app.patch("/admin/users/{user_id}/mmr")
def update_user_mmr(user_id: int, data: MMRUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.mmr = data.mmr
    db.commit()
    return {"detail": f"User {user.email} MMR updated successfully."}

@app.get("/admin/flagged_users", response_model=List[schemas.User])
def get_flagged_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.User).filter(models.User.role == "player", models.User.is_flagged == True).all()

@app.get("/admin/users", response_model=List[schemas.User])
def get_all_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.User).filter(models.User.role == "player").all()

@app.post("/admin/instant-match")
async def create_instant_match(
    match_data: schemas.InstantMatchCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    if match_data.match_type == "Squad":
        if not match_data.team1_id or not match_data.team2_id:
            raise HTTPException(status_code=400, detail="Team IDs required for Squad matches")
        if match_data.team1_id == match_data.team2_id:
            raise HTTPException(status_code=400, detail="Teams must be different")
            
        team1 = db.query(models.Team).filter(models.Team.id == match_data.team1_id).first()
        team2 = db.query(models.Team).filter(models.Team.id == match_data.team2_id).first()
        if not team1 or not team2:
            raise HTTPException(status_code=404, detail="One or both teams not found")
            
        tourney_name = f"Instant Squad Match: {team1.name} vs {team2.name}"
        db_tournament = models.Tournament(
            name=tourney_name,
            game=match_data.game,
            prize_pool=match_data.prize_pool,
            max_players=16,
            entry_fee=0.0,
            status="Ongoing",
            match_type="Squad",
            banner=match_data.banner,
            stream_url=match_data.stream_url
        )
        db.add(db_tournament)
        db.commit()
        db.refresh(db_tournament)
        
        reg1 = models.Registration(user_id=team1.captain_id, team_id=team1.id, tournament_id=db_tournament.id, registration_status="Approved")
        reg2 = models.Registration(user_id=team2.captain_id, team_id=team2.id, tournament_id=db_tournament.id, registration_status="Approved")
        db.add(reg1)
        db.add(reg2)
        
        members1 = db.query(models.TeamMember).filter(models.TeamMember.team_id == team1.id).all()
        members2 = db.query(models.TeamMember).filter(models.TeamMember.team_id == team2.id).all()
        for m in members1 + members2:
            db.add(models.Leaderboard(player_id=m.user_id, tournament_id=db_tournament.id, points=0, wins=0, kills=0, mvps=0, win_rate=0.0))
            
        new_match = models.Match(
            tournament_id=db_tournament.id,
            team1_id=team1.id,
            team2_id=team2.id,
            match_status="Ongoing",
            round=1
        )
        db.add(new_match)
        db.commit()
        
    else:
        if not match_data.player1_id or not match_data.player2_id:
            raise HTTPException(status_code=400, detail="Player IDs required for 1v1 matches")
        if match_data.player1_id == match_data.player2_id:
            raise HTTPException(status_code=400, detail="Players must be different")

        player1 = db.query(models.User).filter(models.User.id == match_data.player1_id).first()
        player2 = db.query(models.User).filter(models.User.id == match_data.player2_id).first()
        
        if not player1 or not player2:
            raise HTTPException(status_code=404, detail="One or both players not found")

        tourney_name = f"Instant Match: {player1.name} vs {player2.name}"
        db_tournament = models.Tournament(
            name=tourney_name,
            game=match_data.game,
            prize_pool=match_data.prize_pool,
            max_players=2,
            entry_fee=0.0,
            status="Ongoing",
            match_type="Solo",
            banner=match_data.banner,
            stream_url=match_data.stream_url
        )
        db.add(db_tournament)
        db.commit()
        db.refresh(db_tournament)
        
        reg1 = models.Registration(user_id=player1.id, tournament_id=db_tournament.id, registration_status="Approved")
        reg2 = models.Registration(user_id=player2.id, tournament_id=db_tournament.id, registration_status="Approved")
        db.add(reg1)
        db.add(reg2)
        
        lb1 = models.Leaderboard(player_id=player1.id, tournament_id=db_tournament.id, points=0, wins=0, kills=0, mvps=0, win_rate=0.0)
        lb2 = models.Leaderboard(player_id=player2.id, tournament_id=db_tournament.id, points=0, wins=0, kills=0, mvps=0, win_rate=0.0)
        db.add(lb1)
        db.add(lb2)

        new_match = models.Match(
            tournament_id=db_tournament.id,
            player1_id=player1.id,
            player2_id=player2.id,
            match_status="Ongoing",
            round=1,
            player1_score=0,
            player2_score=0
        )
        db.add(new_match)
        db.commit()
        db.refresh(new_match)
    
    # 3.5 Auto-create Live Stream for EsportsTV
    if match_data.stream_url:
        import random
        platform = "YouTube" if "youtu" in match_data.stream_url.lower() else "Twitch" if "twitch" in match_data.stream_url.lower() else "Custom"
        stream = models.Stream(
            user_id=current_user.id,
            match_id=new_match.id,
            platform=platform,
            stream_url=match_data.stream_url,
            title=tourney_name,
            viewer_count=random.randint(50, 5000),
            is_live=True
        )
        db.add(stream)
        db.commit()
    
    # 4. Broadcast
    import asyncio
    asyncio.create_task(manager.broadcast({"type": "REFRESH_TOURNAMENTS"}))
    asyncio.create_task(manager.broadcast({"type": "REFRESH_REGISTRATIONS"}))
    
    return {"detail": "Instant match created successfully", "tournament_id": db_tournament.id}

@app.post("/superchat/razorpay-order")
async def create_superchat_order(
    sc_data: schemas.SuperchatCheckout,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user.is_premium and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Need premium for Superchat")
        
    active_stream = db.query(models.Stream).filter(models.Stream.is_live == True).first()
    if not active_stream:
        raise HTTPException(status_code=400, detail="No active live stream to superchat on")
        
    try:
        order_amount = int(sc_data.amount * 100) # INR paise
        order_currency = 'INR'
        order_receipt = f'superchat_{current_user.id}'
        notes = {
            'type': 'superchat',
            'message': sc_data.message[:200], # max length 255
            'user_id': str(current_user.id)
        }
        
        razorpay_order = razorpay_client.order.create(dict(amount=order_amount, currency=order_currency, receipt=order_receipt, notes=notes))
        return {
            "order_id": razorpay_order['id'],
            "amount": order_amount,
            "currency": order_currency,
            "key_id": os.getenv("RAZORPAY_KEY_ID")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Razorpay error: {str(e)}")

processed_superchats = set()

@app.post("/verify-superchat-razorpay")
async def verify_superchat_payment(data: dict, db: Session = Depends(database.get_db)):
    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        
        if razorpay_payment_id in processed_superchats:
             return {"detail": "Superchat already verified"}
             
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        order = razorpay_client.order.fetch(razorpay_order_id)
        notes = order.get('notes', {})
        if notes.get('type') == 'superchat':
            user_id = int(notes.get('user_id', 0))
            amount = order.get('amount', 0) / 100.0
            message = notes.get('message', "")
            
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                admin_user = db.query(models.User).filter(models.User.role == "admin").first()
                if admin_user:
                    admin_user.wallet_balance += amount
                    
                tx = models.Transaction(
                    user_id=admin_user.id if admin_user else user.id,
                    amount=amount,
                    currency="INR",
                    transaction_type="Superchat_Revenue",
                    status="Completed",
                    reference_id=razorpay_payment_id
                )
                db.add(tx)
                
                sc = models.Superchat(
                    user_id=user.id,
                    message=message,
                    amount=amount,
                    currency="INR",
                    session_id=razorpay_payment_id
                )
                db.add(sc)
                db.commit()
                
                await manager.broadcast({
                    "type": "SUPER_CHAT",
                    "user": user.name,
                    "avatar": user.avatar or '',
                    "content": message,
                    "amount": amount,
                    "timestamp": datetime.utcnow().isoformat()
                })
            processed_superchats.add(razorpay_payment_id)
            return {"detail": "Superchat verified successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid order type")
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature verification failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/superchat/recent")
def get_recent_superchats(db: Session = Depends(database.get_db)):
    superchats = db.query(models.Superchat).order_by(models.Superchat.created_at.desc()).limit(10).all()
    # Format exactly like websocket messages
    results = []
    for sc in superchats:
        user = db.query(models.User).filter(models.User.id == sc.user_id).first()
        results.append({
            "type": "SUPER_CHAT",
            "user": user.name if user else "Unknown",
            "avatar": user.avatar if user else "",
            "content": sc.message,
            "amount": sc.amount,
            "timestamp": sc.created_at.isoformat()
        })
    # Return oldest first to render sequentially
    return list(reversed(results))

# Wallet endpoints have been extracted to routers/wallet.py

@app.get("/admin/comms/logs")
def get_admin_comms_logs(current_user: models.User = Depends(auth.get_current_admin_user)):
    return communications.get_comms_logs()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
