import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mypostgresql@localhost/ULTRA_ESPORTS")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
try:
    # Set player3's email
    player3 = db.query(models.User).filter(models.User.email == "player3@uaep.com").first()
    if player3:
        player3.email = "sathishtrader97@gmail.com"
        print(f"Updated {player3.name}'s email to sathishtrader97@gmail.com")
    
    # Update mobile_no for all users
    users = db.query(models.User).all()
    for user in users:
        user.mobile_no = "+919843870690"
    
    db.commit()
    print("Successfully updated all users' mobile numbers.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
