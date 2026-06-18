import requests

# Assuming the backend is running on localhost:8000
url = "http://localhost:8000/matches/10/result"
payload = {
    "match_status": "Completed",
    "player1_score": 5,
    "player2_score": 2,
    "player1_kills": 0,
    "player2_kills": 0
}
headers = {
    "Content-Type": "application/json",
    # We would need the admin token here
}
print("Test script created. We need an admin token to actually run it.")
