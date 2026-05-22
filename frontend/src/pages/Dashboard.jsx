import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import PlayerDashboard from './PlayerDashboard';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return null; // Handled by private route
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-wider mb-2">
          {user.role === 'admin' ? 'Command Center' : 'Player Headquarters'}
        </h1>
        <p className="text-textMuted flex items-center gap-2">
          Welcome back, <span className="text-secondary font-medium">{user.name}</span>
          <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded border border-primary/30 uppercase">
            Level {Math.floor(user.ranking_points / 100) + 1}
          </span>
        </p>
      </div>

      {user.role === 'admin' ? <AdminDashboard /> : <PlayerDashboard />}
    </motion.div>
  );
}
