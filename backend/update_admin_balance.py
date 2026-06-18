from database import SessionLocal
from models import User

def set_admin_balance():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        if admin:
            admin.wallet_balance = 500000.0
            db.commit()
            print("Admin balance updated to 500000")
        else:
            print("Admin not found")
    finally:
        db.close()

if __name__ == "__main__":
    set_admin_balance()
