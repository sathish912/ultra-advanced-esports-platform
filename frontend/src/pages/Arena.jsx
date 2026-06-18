import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PageHeader from '../components/layout/PageHeader';
import NeonCard from '../components/ui/NeonCard';
import RankBadge from '../components/ui/RankBadge';
import {
  Trophy,
  Swords,
  Tv,
  BarChart3,
  Users,
  Zap,
  Radio,
  ShoppingBag,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

const quickLinks = [
  { to: '/tournaments', icon: Trophy, label: 'Tournaments', accent: 'cyan', desc: 'Browse & register' },
  { to: '/leaderboard', icon: BarChart3, label: 'Rankings', accent: 'purple', desc: 'Global & seasonal' },
  { to: '/esports-tv', icon: Tv, label: 'Live TV', accent: 'magenta', desc: 'Streams & superchat' },
  { to: '/dashboard', icon: Swords, label: 'Command', accent: 'gold', desc: 'Your HQ' },
  { to: '/social', icon: MessageCircle, label: 'Social', accent: 'cyan', desc: 'Global chat' },
  { to: '/marketplace', icon: ShoppingBag, label: 'Store', accent: 'purple', desc: 'Rewards & passes' },
];

export default function Arena() {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [stats, setStats] = useState({ tournaments: 0, live: 0, players: 0 });
  const [featuredMatch, setFeaturedMatch] = useState(null);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, lbRes, mRes] = await Promise.all([
          api.get('/tournaments'),
          api.get('/leaderboard'),
          api.get('/matches')
        ]);
        const tournaments = tRes.data || [];
        setStats({
          tournaments: tournaments.length,
          live: tournaments.filter((t) => t.status === 'Ongoing').length,
          players: lbRes.data?.length ?? 0,
        });

        const matches = mRes.data || [];
        const upcoming = matches.find(m => m.match_status === 'Scheduled' || m.match_status === 'Ongoing');
        if (upcoming) {
          setFeaturedMatch(upcoming);
          try {
            const predRes = await api.get(`/ai/predict-match/${upcoming.id}`);
            setPrediction(predRes.data);
          } catch (e) {
            console.error("Failed to fetch prediction");
          }
        }

      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
        <PageHeader
          badge="Competitive Lobby"
          title="Ultra Arena"
          subtitle="Your gateway to tournaments, live matches, rankings, and the full competitive ecosystem."
        >
          <div className="flex flex-wrap gap-3 items-center">
            <span
              className={`status-pill ${connected ? 'bg-neonGreen/10 text-neonGreen border-neonGreen/40' : 'bg-danger/10 text-danger border-danger/40'}`}
            >
              <Radio className="inline w-3 h-3 mr-1" />
              {connected ? 'Live Sync' : 'Reconnecting'}
            </span>
            {user && user.role !== 'admin' && <RankBadge points={user.ranking_points} size="lg" showProgress />}
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active Events', value: stats.tournaments, icon: Trophy, color: 'text-primary' },
            { label: 'Live Now', value: stats.live, icon: Zap, color: 'text-secondary' },
            { label: 'Ranked Players', value: stats.players, icon: Users, color: 'text-accent' },
          ].map((s, i) => (
            <NeonCard key={s.label} accent={['cyan', 'magenta', 'purple'][i]} delay={i * 0.08}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-textMuted font-bold">{s.label}</p>
                  <p className="text-3xl font-display font-black text-white mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-10 h-10 ${s.color} opacity-80`} />
              </div>
            </NeonCard>
          ))}
        </div>

        {/* AI Featured Match Prediction */}
        {featuredMatch && prediction && (
          <div className="mb-10">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-textMuted mb-4 flex items-center gap-2">
              <Zap className="text-primary w-4 h-4" /> AI Engine Match Prediction
            </h2>
            <NeonCard accent="cyan" className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg text-white">{featuredMatch.player1?.name || "Player 1"}</span>
                    <span className="font-bold text-primary">{Math.round(prediction.player1_win_probability * 100)}%</span>
                  </div>
                  <div className="h-4 bg-background border border-white/10 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-primary relative" 
                      style={{ width: `${prediction.player1_win_probability * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                    <div 
                      className="h-full bg-secondary relative" 
                      style={{ width: `${prediction.player2_win_probability * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-secondary">{Math.round(prediction.player2_win_probability * 100)}%</span>
                    <span className="font-bold text-lg text-white">{featuredMatch.player2?.name || "Player 2"}</span>
                  </div>
                </div>
                
                <div className="bg-background/50 border border-white/10 p-4 rounded-xl max-w-sm text-center">
                  <p className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2">AI Analysis</p>
                  <p className="text-sm text-white italic">"{prediction.ai_commentary}"</p>
                  <div className="mt-3 inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] uppercase font-bold tracking-widest">
                    Confidence: {Math.round(prediction.confidence_score * 100)}%
                  </div>
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-textMuted mb-4">Quick Deploy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link, i) => (
            <Link key={link.to} to={link.to}>
              <NeonCard accent={link.accent} delay={0.05 * i} className="h-full group">
                <link.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-bold text-white text-lg">{link.label}</h3>
                <p className="text-sm text-textMuted mt-1">{link.desc}</p>
              </NeonCard>
            </Link>
          ))}
        </div>

        {!user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 glass-panel-neon rounded-2xl p-8 text-center border-primary/30"
          >
            <p className="text-textMuted mb-4">Sign in to unlock tournaments, wallet, and premium features.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/register" className="btn-primary">
                Join Ultra Network
              </Link>
              <Link to="/login" className="btn-secondary">
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
