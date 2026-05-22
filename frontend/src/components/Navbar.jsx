import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, LogOut, User as UserIcon, Trophy, BarChart2, Tv } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <Gamepad2 className="h-8 w-8 text-primary group-hover:text-secondary transition-colors" />
              <span className="font-display font-bold text-xl tracking-wider text-white">AETMS</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/tournaments" className="flex items-center space-x-1 text-gray-300 hover:text-secondary transition-colors">
                  <Trophy className="h-4 w-4" />
                  <span>Tournaments</span>
                </Link>
                <Link to="/esports-tv" className="flex items-center space-x-1 text-gray-300 hover:text-secondary transition-colors">
                  <Tv className="h-4 w-4 text-red-500 animate-pulse" />
                  <span>Esports TV</span>
                </Link>
                <Link to="/leaderboard" className="flex items-center space-x-1 text-gray-300 hover:text-secondary transition-colors">
                  <BarChart2 className="h-4 w-4" />
                  <span>Leaderboard</span>
                </Link>
                <Link to="/dashboard" className="flex items-center space-x-1 text-gray-300 hover:text-secondary transition-colors">
                  <UserIcon className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center space-x-4 pl-4 border-l border-white/10">
                  <span className="text-sm font-medium text-primary uppercase">{user.role}</span>
                  <button onClick={handleLogout} className="flex items-center space-x-1 text-gray-400 hover:text-primary transition-colors">
                    <LogOut className="h-4 w-4" />
                    <span>Exit</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-secondary transition-colors font-medium">Login</Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-4">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
