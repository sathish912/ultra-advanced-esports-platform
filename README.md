# Advanced eSports Tournament Management System (AETMS) 🎮🏆

AETMS is a comprehensive, full-stack web application designed to manage eSports tournaments seamlessly. It provides a platform for gamers to discover tournaments, register with secure payments, and engage with the community via real-time live chat during streams.

## 🌟 Key Features

* **User Authentication & Profiles:** Secure sign-up and login system using JWT. Players can manage their profiles and track their tournament history.
* **Tournament Discovery & Registration:** Browse upcoming, ongoing, and completed tournaments. Detailed views including prize pools, game types (BGMI, CS2, Free Fire, Valorant), and max player caps.
* **Stripe Payment Integration:** Secure and seamless entry fee processing for premium tournaments using Stripe Checkout.
* **Real-time "Esports TV" Live Chat:** Integrated WebSockets allow players to watch tournament streams and chat with the community in real-time. Features include standard chat and highlighted "Super Chat".
* **Dynamic Leaderboards:** Track top-performing players across different games.
* **Player Dashboard:** A personalized dashboard tracking registered tournaments, match schedules, and overall statistics.

## 🛠️ Technology Stack

**Frontend:**
* React (Vite)
* Tailwind CSS (for modern, responsive styling)
* React Router DOM (Navigation)
* Framer Motion (Animations)
* Lucide React (Icons)
* Axios (API requests)

**Backend:**
* Python (FastAPI)
* SQLAlchemy (ORM)
* MySQL (Database)
* WebSockets (Real-time chat)
* Stripe Python SDK (Payments)
* Python-Jose & Passlib (JWT Authentication & Password Hashing)

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v16 or higher)
* [Python](https://www.python.org/) (v3.10 or higher)
* [MySQL Server](https://dev.mysql.com/downloads/mysql/)

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/sathish912/advanced-esports-tournament-management-system.git
cd advanced-esports-tournament-management-system
```

### 2. Database Setup
1. Start your MySQL server.
2. Create a new database named `aetms`:
   ```sql
   CREATE DATABASE aetms;
   ```

### 3. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install the required Python packages:
   ```bash
   pip install fastapi uvicorn sqlalchemy pymysql passlib[bcrypt] python-jose python-multipart stripe websockets python-dotenv
   ```
4. Create a `.env` file in the `backend` directory and add your Stripe Secret Key:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   ```
5. Run the FastAPI server:
   ```bash
   fastapi dev main.py
   # Or using uvicorn:
   uvicorn main:app --reload
   ```
   *The backend will be running at `http://localhost:8000`*

### 4. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running at `http://localhost:5173`*

## 💡 Usage

1. Open your browser and go to `http://localhost:5173`.
2. Create a new account or log in.
3. Head to the **Tournaments** page to browse and register for upcoming events (Stripe test mode is enabled for paid entries).
4. Visit **Esports TV** to experience the real-time websocket chat.

## 📄 License
This project is for educational and submission purposes.
