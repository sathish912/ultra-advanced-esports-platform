from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mypostgresql@localhost/ULTRA_ESPORTS")

try:
    # Connect to PostgreSQL
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    # Verify the connection works
    connection = engine.connect()
    connection.close()
    print("Database Connection: Successfully connected to PostgreSQL.")
except Exception as e:
    print(f"Database Connection Error: Failed to connect to PostgreSQL ({e}). Please ensure the database server is running.")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
