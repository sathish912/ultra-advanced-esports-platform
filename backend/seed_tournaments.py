import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

import database
import models
import auth

db = next(database.get_db())

# Games
games = ["Valorant", "CS:GO", "Dota 2", "League of Legends", "Apex Legends", "PUBG Mobile", "Free Fire", "Call of Duty: Warzone", "Overwatch 2", "Rocket League"]

# Ensure at least 10 users exist and are premium
users = db.query(models.User).all()
while len(users) < 10:
    new_user = models.User(
        name=f"ProPlayer{len(users)+1}",
        email=f"player{len(users)+1}@example.com",
        password=auth.get_password_hash("password123"),
        is_premium=True,
        wallet_balance=500.0,
        ranking_points=0,
        mmr=1000.0,
        tier="Bronze",
        country="India"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    users.append(new_user)

# Make sure first 10 are premium
for i in range(10):
    users[i].is_premium = True
    users[i].wallet_balance = users[i].wallet_balance or 500.0
db.commit()

# Create Tournaments
now = datetime.utcnow()
statuses = [
    ("Upcoming", now + timedelta(days=10), now + timedelta(days=15), now + timedelta(days=20)),
    ("Upcoming", now + timedelta(days=5), now + timedelta(days=10), now + timedelta(days=12)),
    ("Registration Open", now - timedelta(days=2), now + timedelta(days=5), now + timedelta(days=7)),
    ("Registration Open", now - timedelta(days=1), now + timedelta(days=3), now + timedelta(days=5)),
    ("Registration Open", now - timedelta(days=3), now + timedelta(days=2), now + timedelta(days=4)),
    ("Ongoing", now - timedelta(days=10), now - timedelta(days=5), now - timedelta(days=1)),
    ("Ongoing", now - timedelta(days=7), now - timedelta(days=2), now),
    ("Ongoing", now - timedelta(days=5), now - timedelta(days=1), now + timedelta(days=1)),
    ("Completed", now - timedelta(days=20), now - timedelta(days=15), now - timedelta(days=10)),
    ("Completed", now - timedelta(days=15), now - timedelta(days=10), now - timedelta(days=5))
]

for i in range(10):
    t_status, r_start, r_end, m_day = statuses[i]
    t = models.Tournament(
        name=f"{games[i]} Championship {2026}",
        game=games[i],
        prize_pool=10000.0 + i*1000,
        max_players=100,
        entry_fee=50.0,
        currency="INR",
        status=t_status,
        reg_start=r_start,
        reg_end=r_end,
        match_day=m_day,
        match_type="Solo"
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    
    # If completed, process a winner
    if t_status == "Completed":
        winner = random.choice(users[:10])
        
        # Create match
        match = models.Match(
            tournament_id=t.id,
            match_status="Completed",
            winner_id=winner.id,
            player1_id=winner.id,
            player2_id=users[0].id if winner.id != users[0].id else users[1].id,
            player1_score=3,
            player2_score=1
        )
        db.add(match)
        
        # Update user wallet and leaderboard
        winner.wallet_balance += t.prize_pool
        winner.ranking_points += 500
        winner.mmr += 50.0
        winner.wins += 1
        
        # Check tier upgrade
        if winner.mmr > 1500:
            winner.tier = "Gold"
        elif winner.mmr > 1200:
            winner.tier = "Silver"
            
        winner.total_earnings += t.prize_pool
        
        db.commit()

print("Database seeded successfully with tournaments, users, and matches!")
