import requests

# Fetch the last created checkout session from DB to simulate
import sqlite3
import json

db = sqlite3.connect('c:/projects/AETMS/backend/aetms.db')
cursor = db.cursor()
cursor.execute("SELECT session_id FROM superchats ORDER BY id DESC LIMIT 1")
row = cursor.fetchone()

if row:
    session_id = row[0]
    print(f"Found session_id: {session_id}")
    try:
        res = requests.get(f"http://localhost:8000/verify-superchat-payment?session_id={session_id}")
        print(f"Status Code: {res.status_code}")
        print(res.text)
    except Exception as e:
        print(e)
else:
    print("No superchat session found in DB. Did the user restart the backend?")
    # Try to find a registration session if superchats doesn't exist
    pass
