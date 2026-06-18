import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import ParticleField from './components/ui/ParticleField';
import AIAssistantWidget from './components/AIAssistantWidget';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Leaderboard from './pages/Leaderboard';
import EsportsTV from './pages/EsportsTV';
import Profile from './pages/Profile';
import About from './pages/About';
import Arena from './pages/Arena';
import SocialHub from './pages/SocialHub';
import Marketplace from './pages/Marketplace';
import Overlay from './pages/Overlay';
import PublicProfile from './pages/PublicProfile';
import Lobby from './pages/Lobby';
import FantasyLeague from './pages/FantasyLeague';
import Career from './pages/Career';
import Scout from './pages/Scout';
import Support from './pages/Support';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-primary font-display text-sm uppercase tracking-[0.3em] animate-pulse">
          Establishing secure uplink...
        </p>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  const location = useLocation();
  const isOverlay = location.pathname.startsWith('/overlay');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const hideSidebar = isOverlay || isAuthPage;

  return (
    <div className={`min-h-screen flex flex-col ${isOverlay ? 'bg-transparent' : 'bg-void text-textMain selection:bg-primary/30'} relative`}>
      {!isOverlay && <ParticleField count={35} />}
      {!isOverlay && <div className="scanlines-overlay pointer-events-none" />}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0c0c18',
            color: '#f4f4ff',
            border: '1px solid rgba(0, 245, 255, 0.25)',
          },
        }}
      />
      {!hideSidebar && <Sidebar />}
      <main className={`flex-grow relative z-10 ${!hideSidebar ? 'pt-16 lg:pt-0 lg:pl-64' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/esportstv" element={<EsportsTV />} />
          <Route path="/esports-tv" element={<EsportsTV />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/social" element={<SocialHub />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/fantasy" element={<FantasyLeague />} />
          <Route path="/career" element={<Career />} />
          <Route path="/scout" element={<Scout />} />
          <Route path="/overlay/:matchId" element={<Overlay />} />
          <Route path="/player/:id" element={<PublicProfile />} />
          <Route path="/support" element={<Support />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>

      {!isOverlay && (
        <footer className="relative z-10 border-t border-white/10 bg-surface/60 backdrop-blur-md py-8">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <div>
              <p className="font-display font-black tracking-[0.2em] uppercase text-sm neon-text-cyan">
                ULTRA ESPORTS
              </p>
              <p className="text-[10px] text-textMuted uppercase tracking-widest mt-1">
                Next-Gen Competitive Gaming Network © 2026
              </p>
            </div>
            <div className="flex gap-6 text-xs uppercase tracking-widest text-textMuted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                Systems Online
              </span>
              <span>API • PostgreSQL • WebSockets</span>
            </div>
          </div>
        </footer>
      )}
      
      {!isOverlay && <AIAssistantWidget />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
