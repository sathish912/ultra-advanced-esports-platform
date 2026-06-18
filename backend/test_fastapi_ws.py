from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_websocket():
    try:
        with client.websocket_connect("/ws") as websocket:
            print("Connected!")
            data = websocket.receive_text()
            print("Received:", data)
    except Exception as e:
        print("WebSocket Error:", e)

if __name__ == "__main__":
    test_websocket()
