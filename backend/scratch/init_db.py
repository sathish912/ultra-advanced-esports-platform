import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models, database, auth
from database import SessionLocal, engine
from datetime import datetime, timedelta

def seed_database():
    # Re-create tables
    print("Resetting database tables...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create Admin and Players
        print("Seeding users...")
        hashed_admin = auth.get_password_hash("adminpass")
        hashed_player = auth.get_password_hash("playerpass")
        
        admin = models.User(
            name="Apex Referee",
            email="admin@aetms.com",
            password=hashed_admin,
            role="admin",
            avatar="http://localhost:8000/static/avatars/avatar1.png",
            ranking_points=500
        )
        db.add(admin)
        
        p1 = models.User(
            name="AlphaGamer",
            email="player1@aetms.com",
            password=hashed_player,
            role="player",
            avatar="http://localhost:8000/static/avatars/avatar1.png",
            ranking_points=240,
            wins=4,
            losses=2,
            kills=56,
            mvps=2
        )
        db.add(p1)
        
        p2 = models.User(
            name="SniperGod",
            email="player2@aetms.com",
            password=hashed_player,
            role="player",
            avatar="http://localhost:8000/static/avatars/avatar2.png",
            ranking_points=310,
            wins=6,
            losses=1,
            kills=84,
            mvps=4
        )
        db.add(p2)
        
        p3 = models.User(
            name="BetaValkyrie",
            email="player3@aetms.com",
            password=hashed_player,
            role="player",
            avatar="http://localhost:8000/static/avatars/avatar3.png",
            ranking_points=120,
            wins=2,
            losses=4,
            kills=32,
            mvps=0
        )
        db.add(p3)
        
        p4 = models.User(
            name="ClutchMaster",
            email="player4@aetms.com",
            password=hashed_player,
            role="player",
            avatar="http://localhost:8000/static/avatars/avatar1.png",
            ranking_points=180,
            wins=3,
            losses=3,
            kills=45,
            mvps=1
        )
        db.add(p4)
        
        db.commit()
        db.refresh(p1)
        db.refresh(p2)
        db.refresh(p3)
        db.refresh(p4)
        
        # 2. Create Tournaments
        print("Seeding tournaments...")
        now = datetime.now()
        
        t1 = models.Tournament(
            name="BGMI Cyber Cup 2026",
            game="BGMI",
            prize_pool=5000.00,
            max_players=4,
            entry_fee=10.00,
            currency="USD",
            status="Registration Open",
            reg_start=now - timedelta(days=2),
            reg_end=now + timedelta(days=5),
            match_day=now + timedelta(days=7),
            banner="http://localhost:8000/static/banners/bgmi.png",
            rules="1. No hacking/aimbots allowed. 2. Standard battle royale settings. 3. Friendly fire disabled.",
            match_type="Solo"
        )
        db.add(t1)
        
        t2 = models.Tournament(
            name="Valorant Neon Showdown",
            game="Valorant",
            prize_pool=8500.00,
            max_players=16,
            entry_fee=25.00,
            currency="USD",
            status="Upcoming",
            reg_start=now + timedelta(days=1),
            reg_end=now + timedelta(days=10),
            match_day=now + timedelta(days=12),
            banner="http://localhost:8000/static/banners/valorant.png",
            rules="1. Standard 5v5 rules. 2. Map pool: Bind, Ascent, Haven. 3. Overtime win by 2.",
            match_type="Squad"
        )
        db.add(t2)
        
        t3 = models.Tournament(
            name="CS2 Intel Masters",
            game="CS2",
            prize_pool=12000.00,
            max_players=4,
            entry_fee=0.00,
            currency="USD",
            status="Ongoing",
            reg_start=now - timedelta(days=5),
            reg_end=now - timedelta(days=1),
            match_day=now + timedelta(days=1),
            banner="http://localhost:8000/static/banners/cs2.png",
            rules="1. Competitive mode rules. 2. Overtime MR3 standard.",
            match_type="Solo"
        )
        db.add(t3)
        
        t4 = models.Tournament(
            name="Free Fire Firestorm",
            game="Free Fire",
            prize_pool=2500.00,
            max_players=8,
            entry_fee=5.00,
            currency="USD",
            status="Completed",
            reg_start=now - timedelta(days=10),
            reg_end=now - timedelta(days=4),
            match_day=now - timedelta(days=2),
            banner="http://localhost:8000/static/banners/freefire.png",
            rules="1. Standard Clash Squad maps.",
            match_type="Duo"
        )
        db.add(t4)
        
        db.commit()
        db.refresh(t1)
        db.refresh(t2)
        db.refresh(t3)
        db.refresh(t4)
        
        # 3. Create Registrations for Ongoing CS2 Masters
        print("Seeding registrations...")
        for player in [p1, p2, p3, p4]:
            reg = models.Registration(
                user_id=player.id,
                tournament_id=t3.id,
                registration_status="Approved"
            )
            db.add(reg)
            
            # Leaderboard entry
            lb = models.Leaderboard(
                player_id=player.id,
                tournament_id=t3.id,
                points=0,
                wins=0,
                kills=0,
                mvps=0,
                win_rate=0.0
            )
            db.add(lb)
            
        # Add some registrations for BGMI Cyber Cup (Pending / Approved)
        reg_bgmi_1 = models.Registration(
            user_id=p1.id,
            tournament_id=t1.id,
            registration_status="Approved"
        )
        db.add(reg_bgmi_1)
        lb_bgmi_1 = models.Leaderboard(
            player_id=p1.id,
            tournament_id=t1.id,
            points=50,
            wins=1,
            kills=12,
            mvps=1,
            win_rate=1.0,
            rank=1
        )
        db.add(lb_bgmi_1)
        
        reg_bgmi_2 = models.Registration(
            user_id=p2.id,
            tournament_id=t1.id,
            registration_status="Pending"
        )
        db.add(reg_bgmi_2)
        
        db.commit()
        
        # 4. Generate CS2 Ongoing Round 1 Matchups
        print("Seeding CS2 matches...")
        match_cs2_1 = models.Match(
            tournament_id=t3.id,
            player1_id=p1.id,
            player2_id=p2.id,
            match_status="Scheduled",
            round=1,
            player1_score=0,
            player2_score=0
        )
        db.add(match_cs2_1)
        
        match_cs2_2 = models.Match(
            tournament_id=t3.id,
            player1_id=p3.id,
            player2_id=p4.id,
            match_status="Scheduled",
            round=1,
            player1_score=0,
            player2_score=0
        )
        db.add(match_cs2_2)
        
        # 5. Create some notifications
        print("Seeding notifications...")
        n1 = models.Notification(
            user_id=p1.id,
            title="Intel Alert: Approved!",
            message="Your registration request for 'BGMI Cyber Cup 2026' has been approved! Prepare your squad."
        )
        db.add(n1)
        
        n2 = models.Notification(
            user_id=p1.id,
            title="⚔️ Match Scheduled!",
            message="Round 1 matchups drawn for 'CS2 Intel Masters'. You are playing against SniperGod!"
        )
        db.add(n2)
        
        db.commit()
        print("Database initialized and populated successfully!")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
