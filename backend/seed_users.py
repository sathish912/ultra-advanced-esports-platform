import os
from sqlalchemy.orm import Session
import database
import models
import auth

# Initialize DB connection
db: Session = database.SessionLocal()

names = [
    "CyberNinja", "GhostRecon", "ViperStrike", "NeonSamurai", "ShadowSniper",
    "IronGladiator", "PixelWarrior", "StormBreaker", "QuantumBlaze", "VoidWalker",
    "ToxicAvenger", "CrimsonBlade", "NovaFlash", "LunarEclipse", "TitanFall"
]

password = "playerpass"
hashed_password = auth.get_password_hash(password)

try:
    for i in range(1, 16):
        email = f"player{i}@uaep.com"
        name = names[i-1]
        avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={name}"
        
        # Check if user already exists
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        if existing_user:
            print(f"User {email} already exists. Skipping.")
            continue
            
        new_user = models.User(
            email=email,
            name=name,
            password=hashed_password,
            role="player",
            avatar=avatar
        )
        db.add(new_user)
        print(f"Added {email} ({name})")
        
    db.commit()
    print("Successfully seeded 15 players!")
    
except Exception as e:
    db.rollback()
    print(f"Error seeding database: {e}")
finally:
    db.close()
