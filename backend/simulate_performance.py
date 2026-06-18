import os
import sys
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import MatchParticipant, FantasyTeam, FantasyTeamRoster, Match

def run():
    db = SessionLocal()
    try:
        # Check if there's any match to associate with
        match = db.query(Match).first()
        if not match:
            match = Match(tournament_id=1, status="Completed") # Just a dummy match
            db.add(match)
            db.flush()
            
        rosters = db.query(FantasyTeamRoster).all()
        players_to_update = set([r.player_id for r in rosters])
        
        count = 0
        for p_id in players_to_update:
            # Check if participant record exists for this player in this match
            mp = db.query(MatchParticipant).filter(MatchParticipant.match_id == match.id, MatchParticipant.user_id == p_id).first()
            if not mp:
                mp = MatchParticipant(match_id=match.id, user_id=p_id)
                db.add(mp)
            
            # Simulate performance
            mp.kills = random.randint(2, 12)
            mp.assists = random.randint(0, 8)
            mp.damage = random.randint(400, 2500)
            mp.survival_time = random.randint(600, 1800)
            
            # 1 pt per kill, 1 pt per 100 dmg, etc.
            mp.total_points = float(mp.kills * 10 + (mp.damage / 100) * 2 + mp.assists * 5)
            count += 1
            
        # Recalculate Fantasy Team scores
        teams = db.query(FantasyTeam).all()
        for team in teams:
            total = 0
            for r in team.roster:
                pts = db.query(MatchParticipant.total_points).filter(MatchParticipant.user_id == r.player_id).scalar()
                if pts:
                    total += pts
            team.score = total
            
        db.commit()
        print(f"Successfully simulated performance for {count} players and updated Fantasy Teams!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()
