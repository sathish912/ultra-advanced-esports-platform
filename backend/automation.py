import datetime
from sqlalchemy.orm import Session
import models
import communications

# In-memory log storage for automation events (last 50)
AUTOMATION_LOGS = []

def log_event(message: str):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    AUTOMATION_LOGS.insert(0, log_entry)
    print(f"[AUTOMATION] {log_entry}")
    if len(AUTOMATION_LOGS) > 50:
        AUTOMATION_LOGS.pop()

def get_recent_logs():
    return AUTOMATION_LOGS

def auto_calculate_fantasy_scores():
    from database import SessionLocal
    from sqlalchemy import func
    db = SessionLocal()
    try:
        log_event("Starting background fantasy score recalculation...")
        teams = db.query(models.FantasyTeam).all()
        for team in teams:
            total = 0
            for roster_member in team.roster:
                pts = db.query(func.sum(models.MatchParticipant.total_points)).filter(
                    models.MatchParticipant.user_id == roster_member.player_id
                ).scalar()
                if pts:
                    total += pts
            team.score = total
        db.commit()
        log_event("Finished background fantasy score recalculation.")
    except Exception as e:
        log_event(f"Error recalculating fantasy scores: {e}")
        db.rollback()
    finally:
        db.close()

def auto_generate_tournaments(db: Session):
    # Check if there's a tournament scheduled for the upcoming weekend
    now = datetime.datetime.now()
    # Find next Saturday
    days_ahead = 5 - now.weekday()
    if days_ahead <= 0: # Target next week if it's already Saturday/Sunday
        days_ahead += 7
    next_saturday = now + datetime.timedelta(days=days_ahead)
    next_saturday = next_saturday.replace(hour=18, minute=0, second=0, microsecond=0)
    
    # Check if a tournament exists on that day
    start_of_day = next_saturday.replace(hour=0, minute=0, second=0)
    end_of_day = next_saturday.replace(hour=23, minute=59, second=59)
    
    existing = db.query(models.Tournament).filter(
        models.Tournament.match_day >= start_of_day,
        models.Tournament.match_day <= end_of_day
    ).first()
    
    if not existing:
        log_event(f"No tournament found for {next_saturday.date()}. Auto-generating 'Weekend Rumble'...")
        new_tourney = models.Tournament(
            name=f"Weekend Rumble {next_saturday.strftime('%b %d')}",
            game="BGMI",
            prize_pool=5000,
            max_players=16,
            entry_fee=0,
            currency="INR",
            banner="http://localhost:8000/static/banners/mrgamer.png",
            rules="Auto-generated weekend standard ruleset.",
            reg_start=now,
            reg_end=next_saturday - datetime.timedelta(hours=2),
            match_day=next_saturday,
            match_type="Squad",
            status="Registration Open"
        )
        db.add(new_tourney)
        db.commit()
        log_event(f"Successfully generated Tournament ID: {new_tourney.id}")
        return True
    return False

def auto_start_tournaments(db: Session):
    now = datetime.datetime.now()
    # Find tournaments that are "Upcoming", "Registration Open", or "Registration Closed" where match_day is past
    ready_tourneys = db.query(models.Tournament).filter(
        models.Tournament.status.in_(["Upcoming", "Registration Open", "Registration Closed"]),
        models.Tournament.match_day <= now
    ).all()
    
    count = 0
    for t in ready_tourneys:
        t.status = "Ongoing"
        t.match_day = now # Update match_day to today so it looks fresh
        
        # Auto-generate matches
        existing = db.query(models.Match).filter(models.Match.tournament_id == t.id).first()
        if not existing:
            regs = db.query(models.Registration).filter(
                models.Registration.tournament_id == t.id,
                models.Registration.registration_status == "Approved"
            ).all()
            if regs:
                players = [r.user for r in regs]
                import random
                random.shuffle(players)
                i = 0
                while i < len(players):
                    if i + 1 < len(players):
                        new_match = models.Match(
                            tournament_id=t.id,
                            player1_id=players[i].id,
                            player2_id=players[i+1].id,
                            match_status="Scheduled",
                            round=1,
                            player1_score=0,
                            player2_score=0,
                            created_at=now
                        )
                        db.add(new_match)
                        i += 2
                    else:
                        bye_match = models.Match(
                            tournament_id=t.id,
                            player1_id=players[i].id,
                            match_status="Completed",
                            winner_id=players[i].id,
                            round=1,
                            scores="Bye",
                            player1_score=1,
                            player2_score=0,
                            created_at=now
                        )
                        db.add(bye_match)
                        i += 1
                log_event(f"Auto-generated bracket for Tournament ID {t.id} ('{t.name}')")
                # Send SMS to all registered players
                for p in players:
                    communications.send_sms(
                        to=p.email, # Using email field as mock phone number since we don't have phone field
                        message=f"ULTRA ESPORTS ALERT: Your tournament '{t.name}' has started! Bracket is live."
                    )
        
        db.commit()
        log_event(f"Auto-started Tournament ID {t.id} ('{t.name}') as its match time has arrived.")
        count += 1
    
    return count > 0

def auto_simulate_matches(db: Session):
    now = datetime.datetime.now()
    cutoff = now - datetime.timedelta(minutes=15)
    
    active_matches = db.query(models.Match).filter(
        models.Match.match_status.in_(["Scheduled", "Ongoing"]),
        models.Match.created_at <= cutoff
    ).all()
    
    count = 0
    import random
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
                
            log_event(f"Auto-simulated Match #{m.id} in Tournament #{m.tournament_id}")
            count += 1
    if count > 0:
        db.commit()
    return count > 0

def auto_progress_tournaments(db: Session):
    ongoing_tournaments = db.query(models.Tournament).filter(models.Tournament.status == "Ongoing").all()
    count = 0
    now = datetime.datetime.now()
    
    for t in ongoing_tournaments:
        max_round_match = db.query(models.Match).filter(models.Match.tournament_id == t.id).order_by(models.Match.round.desc()).first()
        if not max_round_match:
            continue
            
        current_round = max_round_match.round
        active_in_round = db.query(models.Match).filter(
            models.Match.tournament_id == t.id,
            models.Match.round == current_round,
            models.Match.match_status != "Completed"
        ).count()
        
        if active_in_round == 0:
            # Round is complete, gather winners
            winners_matches = db.query(models.Match).filter(
                models.Match.tournament_id == t.id,
                models.Match.round == current_round
            ).all()
            
            winners = []
            for m in winners_matches:
                if m.winner_id:
                    winners.append(m.winner_id)
                    
            if len(winners) <= 1:
                # Tournament finished
                t.status = "Completed"
                log_event(f"Tournament #{t.id} completed! Winner: {winners[0] if winners else 'None'}")
                count += 1
            else:
                # Generate next round if it doesn't already exist
                next_round_exists = db.query(models.Match).filter(
                    models.Match.tournament_id == t.id,
                    models.Match.round == current_round + 1
                ).first()
                
                if not next_round_exists:
                    import random
                    random.shuffle(winners)
                    i = 0
                    while i < len(winners):
                        if i + 1 < len(winners):
                            new_match = models.Match(
                                tournament_id=t.id,
                                player1_id=winners[i],
                                player2_id=winners[i+1],
                                match_status="Scheduled",
                                round=current_round + 1,
                                player1_score=0,
                                player2_score=0,
                                created_at=now
                            )
                            db.add(new_match)
                            i += 2
                        else:
                            bye_match = models.Match(
                                tournament_id=t.id,
                                player1_id=winners[i],
                                match_status="Completed",
                                winner_id=winners[i],
                                round=current_round + 1,
                                scores="Bye",
                                player1_score=1,
                                player2_score=0,
                                created_at=now
                            )
                            db.add(bye_match)
                            i += 1
                    log_event(f"Generated Round {current_round + 1} for Tournament #{t.id}")
                    count += 1
    if count > 0:
        db.commit()
    return count > 0

def auto_distribute_prizes(db: Session):
    # Find completed tournaments
    completed = db.query(models.Tournament).filter(models.Tournament.status == "Completed").all()
    count = 0
    for t in completed:
        dist_exists = db.query(models.Transaction).filter(
            models.Transaction.transaction_type == "Prize_Payout",
            models.Transaction.reference_id == str(t.id)
        ).first()
        
        if not dist_exists and t.prize_pool > 0:
            log_event(f"Calculating prize distribution for Tournament ID {t.id} ('{t.name}')")
            final_match = db.query(models.Match).filter(
                models.Match.tournament_id == t.id,
                models.Match.match_status == "Completed"
            ).order_by(models.Match.round.desc()).first()
            
            if final_match and final_match.winner_id:
                user = db.query(models.User).filter(models.User.id == final_match.winner_id).first()
                if user:
                    user.wallet_balance += float(t.prize_pool)
                    tx = models.Transaction(
                        user_id=user.id,
                        amount=float(t.prize_pool),
                        transaction_type="Prize_Payout",
                        reference_id=str(t.id),
                        status="Completed"
                    )
                    db.add(tx)
                    db.commit()
                    log_event(f"Distributed ₹{t.prize_pool} to User ID {user.id} ({user.name}) for winning {t.name}")
                    
                    communications.send_email(
                        to=user.email,
                        subject=f"Tournament Payout: {t.name}",
                        body=f"Congratulations {user.name}!\n\nYou have been awarded ₹{t.prize_pool} for winning {t.name}. The funds have been added to your secure wallet."
                    )
                    count += 1
    return count > 0

def auto_moderation(db: Session):
    suspicious = db.query(models.User).filter(
        models.User.ai_trust_score < 20,
        models.User.is_flagged == False
    ).all()
    
    count = 0
    for u in suspicious:
        u.is_flagged = True
        log_event(f"Auto-Moderation: Flagged User ID {u.id} ({u.name}) due to low Trust Score ({u.ai_trust_score})")
        db.commit()
        count += 1
    return count > 0

def run_all_automation(db: Session):
    log_event("Starting Automation Engine Cycle...")
    generated = auto_generate_tournaments(db)
    started = auto_start_tournaments(db)
    simulated = auto_simulate_matches(db)
    progressed = auto_progress_tournaments(db)
    distributed = auto_distribute_prizes(db)
    moderated = auto_moderation(db)
    
    if not (generated or started or simulated or progressed or distributed or moderated):
        log_event("Automation Cycle complete. No actionable items found.")
    else:
        log_event("Automation Cycle complete. Actions were executed successfully.")
