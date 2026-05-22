import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import SessionLocal
import models
import auth

def test_verify():
    db = SessionLocal()
    try:
        email = "sathishkupps@gmail.com"
        password = "string"
        print(f"Testing verification for {email}...")
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            print(f"User found. Hashed password: {user.password}")
            is_valid = auth.verify_password(password, user.password)
            print(f"Password valid: {is_valid}")
        else:
            print("User not found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_verify()
