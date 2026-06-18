# ULTRA ESPORTS

Next-generation competitive gaming platform — tournaments, rankings, live streaming, wallets, and admin automation.

## Project layout

| Path | Description |
|------|-------------|
| `AETMS/backend` | FastAPI + PostgreSQL API |
| `AETMS/frontend` | React + Vite + Tailwind (cyberpunk UI) |

## Quick start

### Backend

```bash
cd AETMS/backend
pip install -r requirements.txt
# Configure .env (DATABASE_URL, JWT secret, Stripe keys)
python main.py
```

API: http://localhost:8000

### Frontend

```bash
cd AETMS/frontend
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173

## Frontend highlights (Phase 1)

- **ULTRA ESPORTS** neon cyberpunk design system
- **Arena** — competitive lobby with live stats
- **Rank tiers** — Bronze → Immortal from ranking points
- **Social Hub** — global WebSocket chat
- **Marketplace** — store UI wired to wallet / premium flows
- Centralized **SocketProvider** for real-time toasts & chat

## Default routes

- `/` — Landing
- `/arena` — Gaming lobby
- `/tournaments` — Browse & register
- `/leaderboard` — Global / weekly / seasonal / tournament
- `/esports-tv` — Streams & superchat
- `/social` — Global chat
- `/marketplace` — Store & wallet
- `/dashboard` — Player or admin HQ (auth required)
