import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import engine
import models

def recreate_all():
    print("Explicitly calling create_all...")
    models.Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    recreate_all()
