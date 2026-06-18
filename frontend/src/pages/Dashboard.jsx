import React, { Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import RankBadge from '../components/ui/RankBadge';
import { getRankTier } from '../utils/rankTier';
import { useSocket } from '../context/SocketContext';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
import PlayerDashboard from './PlayerDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { connected } = useSocket();

  if (!user) return null;

  const tier = getRankTier(user.ranking_points);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 glass-panel-neon rounded-2xl p-6 md:p-8 border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-2">
              {user.role === 'admin' ? 'Admin Command' : 'Player HQ'}
            </p>
            <h1 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-wider">
              {user.role === 'admin' ? 'Command Center' : 'Operative Dashboard'}
            </h1>
            <p className="text-textMuted mt-2 flex flex-wrap items-center gap-3">
              Welcome, <span className="text-primary font-semibold">{user.name}</span>
              <span
                className={`status-pill ${connected ? 'border-neonGreen/40 text-neonGreen bg-neonGreen/10' : 'border-danger/40 text-danger bg-danger/10'}`}
              >
                {connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </p>
          </div>
          {user.role !== 'admin' && (
            <div className="flex flex-col items-start md:items-end gap-2">
              <RankBadge points={user.ranking_points} size="lg" showProgress />
              <p className="text-xs text-textMuted">
                MMR <span className="text-white font-bold">{tier.mmr}</span>
                {tier.nextTier && (
                  <>
                    {' '}
                    • Next: <span style={{ color: tier.color }}>{tier.nextTier}</span> ({tier.progress}%)
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {user.role === 'admin' ? (
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="p-12 text-center text-textMuted font-display uppercase tracking-[0.2em] animate-pulse">
                Initializing Command Center...
              </div>
            }
          >
            <AdminDashboard />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <PlayerDashboard />
      )}
    </motion.div>
  );
}
