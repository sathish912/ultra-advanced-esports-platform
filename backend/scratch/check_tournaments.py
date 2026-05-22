import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import engine
from sqlalchemy import inspect

def check_columns():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns("tournaments")]
    print(f"Columns in 'tournaments': {columns}")

if __name__ == "__main__":
    check_columns()
