import database
import models
import random

db = next(database.get_db())

ongoing_tournaments = db.query(models.Tournament).filter(models.Tournament.status == "Ongoing").all()
users = db.query(models.User).filter(models.User.role == "player").all()

count = 0
for t in ongoing_tournaments:
    # We need at least 2 players to make a match
    if len(users) >= 2:
        # Create a few matches
        for i in range(0, min(10, len(users)) - 1, 2):
            match = models.Match(
                tournament_id=t.id,
                match_status="Ongoing",
                player1_id=users[i].id,
                player2_id=users[i+1].id,
                round=1
            )
            db.add(match)
            count += 1

db.commit()
print(f"Successfully generated {count} ongoing matches!")
