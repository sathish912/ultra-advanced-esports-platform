import asyncio
import websockets

async def test():
    headers = {"Origin": "http://localhost:5173"}
    try:
        async with websockets.connect('ws://localhost:8000/ws', additional_headers=headers) as ws:
            print('Connected successfully!')
            await asyncio.sleep(1)
            print('Still connected.')
    except Exception as e:
        print('WebSocket connection error:', e)

if __name__ == '__main__':
    asyncio.run(test())
