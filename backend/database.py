from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:mysql%402026@localhost/AETMS")

try:
    # Try connecting to MySQL
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"connect_timeout": 3})
    # Verify the connection works
    connection = engine.connect()
    connection.close()
    print("Database Connection: Successfully connected to MySQL server.")
except Exception as e:
    print(f"Database Connection Warning: Failed to connect to MySQL ({e}). Falling back to SQLite!")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./aetms.db"
    # SQLite requires different connect arguments for concurrent threads
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
