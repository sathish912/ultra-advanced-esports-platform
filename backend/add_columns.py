import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mypostgresql@localhost/ULTRA_ESPORTS")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

alter_statements = [
    "ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"
]

with engine.connect() as conn:
    for stmt in alter_statements:
        try:
            conn.execute(text(stmt))
            conn.commit()
            print(f"Executed: {stmt}")
        except Exception as e:
            print(f"Error executing {stmt}: {e}")
            conn.rollback()

print("Migration completed.")
