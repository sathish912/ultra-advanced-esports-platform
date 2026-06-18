import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import schemas

db = SessionLocal()
clans = db.query(models.Clan).all()

for clan in clans:
    print(f"Clan ID: {clan.id}, is_banned: {clan.is_banned}")
    try:
        schemas.Clan.from_orm(clan)
        print("Serialization OK")
    except Exception as e:
        print(f"Serialization failed: {e}")

