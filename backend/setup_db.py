import os
from sqlalchemy import create_engine, text

# Uses the same connection string from database.py
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:mysql%402026@localhost/AETMS")

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"connect_timeout": 3})
    connection = engine.connect()
    is_mysql = True
except Exception as e:
    print(f"Failed to connect to MySQL ({e}). Falling back to SQLite!")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./aetms.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    connection = engine.connect()
    is_mysql = False

def column_exists(conn, table, column):
    if is_mysql:
        query = text(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
        result = conn.execute(query).fetchone()
        return result is not None
    else:
        query = text(f"PRAGMA table_info({table})")
        columns = [row[1] for row in conn.execute(query).fetchall()]
        return column in columns

def add_columns():
    try:
        if not column_exists(connection, "users", "is_premium"):
            if is_mysql:
                connection.execute(text("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT TRUE"))
            else:
                connection.execute(text("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 1"))
            print("Added is_premium column")
            
        if not column_exists(connection, "users", "wallet_balance"):
            if is_mysql:
                connection.execute(text("ALTER TABLE users ADD COLUMN wallet_balance FLOAT DEFAULT 500.0"))
            else:
                connection.execute(text("ALTER TABLE users ADD COLUMN wallet_balance FLOAT DEFAULT 500.0"))
            print("Added wallet_balance column")

        if not column_exists(connection, "users", "country"):
            if is_mysql:
                connection.execute(text("ALTER TABLE users ADD COLUMN country VARCHAR(255) DEFAULT 'India'"))
            else:
                connection.execute(text("ALTER TABLE users ADD COLUMN country VARCHAR(255) DEFAULT 'India'"))
            print("Added country column")
            
        connection.commit()
    except Exception as e:
        print(f"Error adding columns: {e}")

def update_player_4():
    try:
        # Assuming player 4 has id=4 or name='Player 4' or we can just set user id=4 to free
        if is_mysql:
            connection.execute(text("UPDATE users SET is_premium = FALSE WHERE id = 4"))
        else:
            connection.execute(text("UPDATE users SET is_premium = 0 WHERE id = 4"))
        connection.commit()
        print("Updated Player 4 to Free plan")
    except Exception as e:
        print(f"Error updating player 4: {e}")

if __name__ == "__main__":
    add_columns()
    update_player_4()
    connection.close()
    print("Database setup complete.")
