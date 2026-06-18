import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, PlayerPortfolio, TeamMember

def run():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.role != 'admin').all()
        count = 0
        for user in users:
            # Check if user has a portfolio
            portfolio = db.query(PlayerPortfolio).filter(PlayerPortfolio.user_id == user.id).first()
            if not portfolio:
                portfolio = PlayerPortfolio(user_id=user.id)
                db.add(portfolio)
                db.flush()
            
            # Check if user is in a squad
            team_member = db.query(TeamMember).filter(TeamMember.user_id == user.id).first()
            
            portfolio.looking_for_team = False if team_member else True
            portfolio.past_teams = None
            portfolio.bio = f"Hi, I'm {user.name}."
            portfolio.preferred_roles = "Assault"
            portfolio.hardware_specs = "Mobile"
            
            count += 1
            
        db.commit()
        print(f"Successfully generated/updated {count} portfolios!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()
