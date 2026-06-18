from database import engine
from sqlalchemy import text

def upgrade():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN best_kill INTEGER DEFAULT 0"))
            conn.commit()
        print("Successfully added best_kill column")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    upgrade()
