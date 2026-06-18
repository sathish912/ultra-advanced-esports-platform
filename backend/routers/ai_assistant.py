from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import models, database
import random
import time
from limiter import limiter

router = APIRouter(
    prefix="/ai",
    tags=["AI Assistant"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    is_ai: bool = True

class ReportResponse(BaseModel):
    report: str

def generate_bot_reply(message: str) -> str:
    msg = message.lower()
    
    if "rank" in msg or "mmr" in msg or "elo" in msg:
        return "Your Competitive MMR determines your global ranking. Winning ranked Arena matches increases your MMR, while losing decreases it. Hit 2500 MMR to reach Diamond Tier!"
    elif "tournament" in msg or "schedule" in msg or "register" in msg:
        return "Tournaments are scheduled dynamically by the server. You can join Battle Royale custom rooms if your squad is registered. Watch the 'Tournaments' tab for upcoming official events."
    elif "prize" in msg or "reward" in msg or "money" in msg or "wallet" in msg:
        return "Prize pools are distributed automatically to your secure Wallet after a tournament concludes. You can withdraw funds via Razorpay/UPI or spend them in the Marketplace."
    elif "clan" in msg or "guild" in msg:
        return "To create or join a clan, navigate to the Social tab! Clan Leaders can customize their banners, recruit operatives from the Scout Network, and lead squads into official Clan Wars."
    elif "career" in msg or "team" in msg or "contract" in msg or "pro" in msg:
        return "The eSports Career System allows you to build a portfolio. Toggle 'Looking For Team' to appear in the Scout Network, where Clan Leaders can offer you professional contracts."
    elif "fantasy" in msg or "vote" in msg or "mvp" in msg or "stream" in msg:
        return "Spectators can draft Fantasy Rosters to earn points based on real pro-player performances. You can also vote for the Live MVP during official Esports TV broadcasts."
    elif "hello" in msg or "hi" in msg or "hey" in msg:
        return "Greetings, Operative. I am the ULTRA ESPORTS AI Assistant. How can I optimize your competitive experience today?"
    else:
        responses = [
            "I'm scanning my databanks for that information. In the meantime, checking the Social or Tournaments tab might have what you need.",
            "That's an interesting tactical question. While my neural net processes it, make sure your loadouts are optimized in the Arena.",
            "I am currently prioritizing tournament referee computations, but my primary directives suggest exploring the Quick Deploy modules.",
            "As an AI, I don't physically game, but my predictive models show that exploring the Social tab might yield the alliances you seek."
        ]
        return random.choice(responses)

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
def chat_with_ai(request: Request, chat_req: ChatRequest):
    time.sleep(0.5) # Simulate AI processing delay
    reply = generate_bot_reply(chat_req.message)
    return ChatResponse(reply=reply)

@router.post("/generate-report/{tournament_id}", response_model=ReportResponse)
@limiter.limit("5/minute")
def generate_tournament_report(request: Request, tournament_id: int, db: Session = Depends(database.get_db)):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    time.sleep(1.5) # Simulate generation
    
    # Generate a procedural report
    status_text = "completed" if tournament.status == "Completed" else "ongoing"
    
    report = f"--- AUTOMATED AI ESPORTS REPORT ---\n"
    report += f"Event: {tournament.name}\n"
    report += f"Status: {status_text.upper()}\n"
    report += f"Prize Pool: ₹{tournament.prize_pool}\n\n"
    
    report += "NARRATIVE SUMMARY:\n"
    report += f"The {tournament.name} showcased incredible tactical prowess and high-octane gameplay. "
    
    if tournament.status == "Completed":
        report += "The champions dominated the final circle, securing the victory with pinpoint accuracy and flawless team coordination. "
        report += "Spectator engagement peaked during the final moments, reflecting the intense competitive nature of the ULTRA ESPORTS network."
    else:
        report += "The brackets are currently highly contested. Predictive algorithms indicate a major upset is possible in the upcoming rounds. "
        report += "Competitors are advised to maintain situational awareness and secure high-tier loot early."
        
    report += "\n\nEnd of AI Analysis."
    
    return ReportResponse(report=report)
