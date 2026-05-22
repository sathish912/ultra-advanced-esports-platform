import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import engine, SessionLocal
import models
import auth

def test_register():
    db = SessionLocal()
    try:
        print("Attempting to insert a test user...")
        hashed_password = auth.get_password_hash("testpassword")
        test_user = models.User(
            name="Test User",
            email="test@example.com",
            password=hashed_password,
            role="player"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"Successfully inserted user with ID: {test_user.id}")
        
        # Cleanup
        db.delete(test_user)
        db.commit()
        print("Test user cleaned up.")

    except Exception as e:
        print(f"FAILED TO INSERT: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_register()
