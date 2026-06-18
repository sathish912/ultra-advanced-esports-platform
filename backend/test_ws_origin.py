import asyncio
import websockets
import requests

async def test():
    # Login
    r = requests.post('http://localhost:8000/login', data={'username':'admin@uaep.com', 'password':'password'})
    if r.status_code != 200:
        print('Login failed:', r.text)
        return
    token = r.json().get('access_token')
    print('Token obtained.')
    
    headers = {"Origin": "http://localhost:5173"}
    try:
        async with websockets.connect(f'ws://localhost:8000/ws?token={token}', extra_headers=headers) as ws:
            print('Connected successfully!')
            await ws.send('{"type":"PING"}')
            print('Message sent.')
            await asyncio.sleep(1)
    except Exception as e:
        print('WebSocket connection error:', e)

if __name__ == '__main__':
    asyncio.run(test())
