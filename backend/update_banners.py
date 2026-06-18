import database
import models

db = next(database.get_db())

# Available local banners
game_to_banner = {
    "Valorant": "http://127.0.0.1:8000/static/banners/valorant.png",
    "CS:GO": "http://127.0.0.1:8000/static/banners/cs2.png",
    "PUBG Mobile": "http://127.0.0.1:8000/static/banners/bgmi.png",
    "Free Fire": "http://127.0.0.1:8000/static/banners/freefire.png",
}

tournaments = db.query(models.Tournament).all()

for t in tournaments:
    if t.game in game_to_banner:
        t.banner = game_to_banner[t.game]
    else:
        # Generate a high-quality placeholder for other games
        formatted_name = t.game.replace(" ", "+")
        t.banner = f"https://placehold.co/800x400/0a0a0f/00ff3f?text={formatted_name}"

db.commit()
print("Banners updated successfully!")
