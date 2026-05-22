import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import SessionLocal
import models

def check_user(email):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            print(f"User FOUND: {user.email}, Role: {user.role}, Name: {user.name}")
        else:
            print(f"User NOT FOUND: {email}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user("sathishkupps@gmail.com")
