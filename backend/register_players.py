import database
import models

db = next(database.get_db())

users = db.query(models.User).all()
open_tournaments = db.query(models.Tournament).filter(models.Tournament.status == "Registration Open").all()

count = 0
for t in open_tournaments:
    for u in users:
        # Check if registration already exists
        existing_reg = db.query(models.Registration).filter_by(user_id=u.id, tournament_id=t.id).first()
        if not existing_reg:
            new_reg = models.Registration(
                user_id=u.id,
                tournament_id=t.id,
                registration_status="Pending" # Or "Approved" if we want them to just be accepted
            )
            db.add(new_reg)
            count += 1

db.commit()
print(f"Successfully registered {len(users)} players to {len(open_tournaments)} open tournaments! Total {count} new registrations created.")
