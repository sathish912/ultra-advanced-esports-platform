import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Team, PlayerContract

def run():
    db = SessionLocal()
    try:
        team = db.query(Team).filter(Team.name == "Alpha Squad Test").first()
        if not team:
            print("No pro team found!")
            return
            
        print(f"Using Team: {team.name} (ID: {team.id})")
        
        # Get target users
        target_users = db.query(User).filter(
            (User.mmr >= 1050) | (User.name.ilike('viperstrike'))
        ).all()
        
        count = 0
        for user in target_users:
            if user.role != "player":
                continue
                
            existing = db.query(PlayerContract).filter(
                PlayerContract.player_id == user.id,
                PlayerContract.team_id == team.id
            ).first()
            
            if not existing:
                new_contract = PlayerContract(
                    player_id=user.id,
                    team_id=team.id,
                    salary=15000.0,
                    duration_months=6,
                    buyout_clause=50000.0,
                    streaming_rights="Team Priority",
                    status="Offered"
                )
                db.add(new_contract)
                count += 1
                
        db.commit()
        print(f"Successfully generated {count} contract offers!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
