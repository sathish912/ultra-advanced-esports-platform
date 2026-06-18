import database
import models
import random

db = next(database.get_db())

allowed_games = {
    "Valorant": "http://127.0.0.1:8000/static/banners/valorant.png",
    "CS:GO": "http://127.0.0.1:8000/static/banners/cs2.png",
    "PUBG Mobile": "http://127.0.0.1:8000/static/banners/bgmi.png",
    "Free Fire": "http://127.0.0.1:8000/static/banners/freefire.png",
}

tournaments = db.query(models.Tournament).all()

for i, t in enumerate(tournaments):
    if t.game not in allowed_games:
        # Assign a random allowed game
        new_game = random.choice(list(allowed_games.keys()))
        t.game = new_game
        # Extract year from name if possible, or just default
        year = "2026"
        if "202" in t.name:
            words = t.name.split()
            for w in words:
                if "202" in w:
                    year = w
                    break
        
        # We append the original ID or something to keep names somewhat unique, or just rely on randomness
        t.name = f"{new_game} Championship {year} Vol {t.id}"
        t.banner = allowed_games[new_game]
    else:
        # If it's already an allowed game, make sure banner is correct
        t.banner = allowed_games[t.game]

db.commit()
print("Tournaments updated to only use the 4 allowed games!")
