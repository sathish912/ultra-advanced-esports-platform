import asyncio
import websockets
import auth
import database
import models

async def test():
    db = next(database.get_db())
    user = db.query(models.User).filter_by(name='sk').first()
    token = auth.create_access_token(data={"sub": user.email})
    
    headers = {"Origin": "http://localhost:5173"}
    try:
        async with websockets.connect(f'ws://127.0.0.1:8000/ws?token={token}', additional_headers=headers) as ws:
            print('Connected successfully!')
            await ws.send('{"type":"PING"}')
            print('Ping sent')
            await asyncio.sleep(1)
            print('Still connected.')
    except Exception as e:
        print('WebSocket connection error:', e)

if __name__ == '__main__':
    asyncio.run(test())
