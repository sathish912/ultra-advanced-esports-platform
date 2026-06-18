import sys
import random
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, FantasyTeam, FantasyTeamRoster

def seed_fantasy_teams():
    db = SessionLocal()
    try:
        # Get 5 users who don't have a fantasy team yet
        existing_owners = [ft.user_id for ft in db.query(FantasyTeam).all()]
        potential_owners = db.query(User).filter(User.id.notin_(existing_owners)).limit(5).all()
        
        if len(potential_owners) < 5:
            print("Not enough users to create 5 teams. Created as many as possible.")

        # Get top 50 players to draft from
        players = db.query(User).filter(User.role == "player").order_by(User.mmr.desc()).limit(50).all()
        
        team_names = ["Neon Knights", "Cyber Punks", "Quantum Strikers", "Void Walkers", "Plasma Dragons"]

        for idx, owner in enumerate(potential_owners):
            name = team_names[idx % len(team_names)]
            team = FantasyTeam(user_id=owner.id, name=name, budget_remaining=10000)
            db.add(team)
            db.flush() # get team.id

            # Randomly draft 5 players under budget
            roster = []
            budget = 10000
            
            # Shuffle players
            random.shuffle(players)
            
            for player in players:
                if len(roster) >= 5:
                    break
                
                price = max(500, int((player.mmr or 1000) / 10))
                if budget >= price:
                    roster.append(player)
                    budget -= price
                    
                    roster_entry = FantasyTeamRoster(fantasy_team_id=team.id, player_id=player.id)
                    db.add(roster_entry)
            
            team.budget_remaining = budget
            print(f"Created Team: {name} (Owner: {owner.name}) - Budget Left: {budget} CR")

        db.commit()
        print("Successfully seeded 5 fantasy teams!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_fantasy_teams()
