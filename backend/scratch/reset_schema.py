import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import engine
from sqlalchemy import text

def reset_tournaments():
    with engine.connect() as connection:
        print("Dropping 'tournaments' table to apply new schema...")
        connection.execute(text("DROP TABLE IF EXISTS leaderboards")) # Cascade-ish
        connection.execute(text("DROP TABLE IF EXISTS registrations"))
        connection.execute(text("DROP TABLE IF EXISTS matches"))
        connection.execute(text("DROP TABLE IF EXISTS tournaments"))
        connection.commit()
        print("Table dropped.")

if __name__ == "__main__":
    reset_tournaments()
