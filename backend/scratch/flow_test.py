import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
import schemas
from database import SessionLocal
from main import generate_tournament_schedule, generate_next_round_schedule, update_match_result
import asyncio

async def run_flow_test():
    print("--- STARTING SYSTEM INTEGRATION FLOW TEST ---")
    db = SessionLocal()
    try:
        # 1. Fetch the tournament "BGMI Cyber Cup 2026"
        tournament = db.query(models.Tournament).filter(models.Tournament.name == "BGMI Cyber Cup 2026").first()
        if not tournament:
            print("ERROR: BGMI Cyber Cup 2026 not found!")
            return
        print(f"Loaded Tournament: {tournament.name} (ID: {tournament.id}) | Current Status: {tournament.status}")

        # 2. Get players
        p1 = db.query(models.User).filter(models.User.name == "AlphaGamer").first()
        p2 = db.query(models.User).filter(models.User.name == "SniperGod").first()
        p3 = db.query(models.User).filter(models.User.name == "BetaValkyrie").first()
        p4 = db.query(models.User).filter(models.User.name == "ClutchMaster").first()

        print(f"Players retrieved: {p1.name}, {p2.name}, {p3.name}, {p4.name}")

        # 3. Ensure all players are registered and approved for BGMI Cyber Cup
        players = [p1, p2, p3, p4]
        for p in players:
            reg = db.query(models.Registration).filter(
                models.Registration.user_id == p.id,
                models.Registration.tournament_id == tournament.id
            ).first()
            if not reg:
                reg = models.Registration(
                    user_id=p.id,
                    tournament_id=tournament.id,
                    registration_status="Approved"
                )
                db.add(reg)
            else:
                reg.registration_status = "Approved"
            
            # Ensure leaderboard entry exists
            lb = db.query(models.Leaderboard).filter(
                models.Leaderboard.player_id == p.id,
                models.Leaderboard.tournament_id == tournament.id
            ).first()
            if not lb:
                lb = models.Leaderboard(
                    player_id=p.id,
                    tournament_id=tournament.id,
                    points=0,
                    wins=0,
                    kills=0,
                    mvps=0,
                    win_rate=0.0
                )
                db.add(lb)
        db.commit()
        print("All 4 players registered and APPROVED.")

        # 4. Generate Round 1 Schedule
        print("\n--- DRAWING BRACKET ROUND 1 ---")
        # Simulate admin drawing bracket
        schedule_res = await generate_tournament_schedule(tournament.id, db, current_user=None)
        print(f"Schedule Result: {schedule_res}")

        # Fetch scheduled matches for BGMI Cup
        matches_r1 = db.query(models.Match).filter(
            models.Match.tournament_id == tournament.id,
            models.Match.round == 1
        ).all()
        print(f"Round 1 Matches Generated: {len(matches_r1)}")
        for idx, m in enumerate(matches_r1):
            p1_name = db.query(models.User).filter(models.User.id == m.player1_id).first().name
            p2_name = db.query(models.User).filter(models.User.id == m.player2_id).first().name if m.player2_id else "BYE"
            print(f"  Match {idx+1} (ID: {m.id}): {p1_name} vs {p2_name} | Status: {m.match_status}")

        # 5. Simulate Referee Score Declaration for Round 1
        print("\n--- DECLARING REFEREE SCORES FOR ROUND 1 ---")
        for idx, m in enumerate(matches_r1):
            if m.match_status == "Completed":
                print(f"  Match {m.id} was a BYE. Automatically completed.")
                continue
            
            # Declare Player 1 as winner of Match
            # Let's say Player 1 gets 16, Player 2 gets 10. Player 1 has 8 kills, Player 2 has 5 kills.
            update_data = models.schemas.MatchUpdate(
                player1_score=16,
                player2_score=10,
                player1_kills=8,
                player2_kills=5,
                match_status="Completed",
                winner_id=m.player1_id,
                scores="16 - 10"
            )
            res = await update_match_result(m.id, update_data, db, current_user=None)
            p1_name = db.query(models.User).filter(models.User.id == m.player1_id).first().name
            p2_name = db.query(models.User).filter(models.User.id == m.player2_id).first().name
            print(f"  Match {m.id} resolved: {p1_name} wins! Score: {m.player1_score}-{m.player2_score} | Kills: {m.player1_kills}-{m.player2_kills}")

        # 6. Generate Round 2 (Final)
        print("\n--- GENERATING NEXT ROUND ---")
        next_round_res = await generate_next_round_schedule(tournament.id, db, current_user=None)
        print(f"Next Round Result: {next_round_res}")

        # Fetch round 2 matches
        matches_r2 = db.query(models.Match).filter(
            models.Match.tournament_id == tournament.id,
            models.Match.round == 2
        ).all()
        print(f"Round 2 Matches Generated: {len(matches_r2)}")
        for idx, m in enumerate(matches_r2):
            p1_name = db.query(models.User).filter(models.User.id == m.player1_id).first().name
            p2_name = db.query(models.User).filter(models.User.id == m.player2_id).first().name if m.player2_id else "BYE"
            print(f"  Match {idx+1} (ID: {m.id}): {p1_name} vs {p2_name} | Status: {m.match_status}")

        # 7. Simulate Referee Score Declaration for Round 2
        print("\n--- DECLARING REFEREE SCORES FOR ROUND 2 (FINALS) ---")
        for idx, m in enumerate(matches_r2):
            if m.match_status == "Completed":
                print(f"  Match {m.id} was a BYE. Automatically completed.")
                continue
            
            # Let's say Player 2 gets 16, Player 1 gets 14. Player 2 has 12 kills, Player 1 has 9 kills.
            update_data = models.schemas.MatchUpdate(
                player1_score=14,
                player2_score=16,
                player1_kills=9,
                player2_kills=12,
                match_status="Completed",
                winner_id=m.player2_id,
                scores="14 - 16"
            )
            res = await update_match_result(m.id, update_data, db, current_user=None)
            p1_name = db.query(models.User).filter(models.User.id == m.player1_id).first().name
            p2_name = db.query(models.User).filter(models.User.id == m.player2_id).first().name
            print(f"  Finals Match {m.id} resolved: {p2_name} wins! Score: {m.player1_score}-{m.player2_score} | Kills: {m.player1_kills}-{m.player2_kills}")

        # 8. Complete Tournament and Declare Champion
        print("\n--- COMPLETING TOURNAMENT ---")
        complete_res = await generate_next_round_schedule(tournament.id, db, current_user=None)
        print(f"Completion Result: {complete_res}")

        # Re-fetch tournament to verify completed status
        db.refresh(tournament)
        print(f"Tournament Status: {tournament.status}")

        # 9. Verify Rankings and Stats
        print("\n--- VERIFYING USER CAREER STATS ---")
        for p in players:
            db.refresh(p)
            print(f"Player: {p.name:15} | Ranking Points: {p.ranking_points:5} | Wins: {p.wins:2} | Losses: {p.losses:2} | Kills: {p.kills:3}")

        # 10. Verify Tournament Leaderboard
        print("\n--- VERIFYING TOURNAMENT LEADERBOARD ---")
        lbs = db.query(models.Leaderboard).filter(
            models.Leaderboard.tournament_id == tournament.id
        ).order_by(models.Leaderboard.points.desc()).all()
        for lb in lbs:
            p_name = db.query(models.User).filter(models.User.id == lb.player_id).first().name
            print(f"Rank {lb.rank}: {p_name:15} | Points: {lb.points:5} | Wins: {lb.wins:2} | Kills: {lb.kills:3} | Win Rate: {lb.win_rate:.2f}")

        print("\n--- INTEGRATION FLOW TEST COMPLETED SUCCESSFULLY ---")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_flow_test())
