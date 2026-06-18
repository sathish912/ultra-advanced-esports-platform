import React, { useState, useEffect } from 'react';
import api from '../api';
import { Trophy, Medal, Award, Globe, Calendar, Clock, Swords, ChevronDown, Crosshair, Crown, BrainCircuit, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RankBadge from '../components/ui/RankBadge';
import PageHeader from '../components/layout/PageHeader';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [leaderboardType, setLeaderboardType] = useState('Global');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  // Fetch tournaments once for the dropdown
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get('/tournaments');
        setTournaments(res.data);
        if (res.data.length > 0) {
          setSelectedTournamentId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch tournaments for leaderboard", err);
      }
    };
    fetchTournaments();
  }, []);

  // Fetch leaderboard based on type and selected tournament
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let endpoint = '/leaderboard';
        if (leaderboardType === 'Weekly') endpoint = '/leaderboard/weekly';
        else if (leaderboardType === 'Seasonal') endpoint = '/leaderboard/seasonal';
        else if (leaderboardType === 'Tournament' && selectedTournamentId) {
          endpoint = `/leaderboard/${selectedTournamentId}`;
        }

        // If Tournament is selected but no ID is available yet, don't fetch
        if (leaderboardType === 'Tournament' && !selectedTournamentId) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        const res = await api.get(endpoint);
        setLeaderboard(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [leaderboardType, selectedTournamentId]);

  const tabs = [
    { id: 'Global', icon: Globe, label: 'Global' },
    { id: 'Tournament', icon: Swords, label: 'Tournament' },
    { id: 'Weekly', icon: Clock, label: 'Weekly' },
    { id: 'Seasonal', icon: Calendar, label: 'Seasonal' }
  ];

  const getPerformanceGrade = (player) => {
    if (player.points === 0 && player.wins === 0 && player.kills === 0) return { grade: 'N/A', color: 'text-textMuted border-transparent' };
    
    // Calculate a composite score based on win rate and points
    let score = (player.win_rate || 0) * 100;
    
    // Bonus for high kills and MVPs
    score += Math.min((player.kills || 0) * 0.5, 20); // up to 20 bonus points
    score += (player.mvps || 0) * 5; // 5 bonus points per MVP
    
    if (score >= 80) return { grade: 'S-Tier', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]' };
    if (score >= 60) return { grade: 'A-Tier', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30 shadow-[0_0_10px_rgba(250,204,21,0.1)]' };
    if (score >= 40) return { grade: 'B-Tier', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
    if (score >= 20) return { grade: 'C-Tier', color: 'text-primary bg-primary/10 border-primary/30' };
    return { grade: 'D-Tier', color: 'text-textMuted bg-white/5 border-white/10' };
  };

  const getAiInsight = () => {
    if (leaderboard.length === 0) return "Not enough data for AI analysis.";
    const top = leaderboard[0];
    const topWinRate = ((top.win_rate || 0) * 100).toFixed(1);
    return `AI ANALYSIS: Operative ${top.name} is currently dominating the ${leaderboardType.toLowerCase()} matrix with a ${topWinRate}% win rate and ${top.kills} confirmed kills. They are demonstrating S-Tier strategic mechanics. Expect heavy resistance if matched against them.`;
  };

  const subtitleMap = {
    Global: 'Top operatives on the Ultra network',
    Weekly: 'Last 7 days — weekly war zone',
    Seasonal: '90-day seasonal campaign',
    Tournament: 'Selected tournament standings',
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-10">
      <PageHeader
        badge="Competitive Rankings"
        title={`${leaderboardType} Leaderboard`}
        subtitle={subtitleMap[leaderboardType]}
      />

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = leaderboardType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLeaderboardType(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_rgba(0,255,63,0.2)]'
                  : 'bg-surface/50 text-textMuted border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tournament Selector */}
      {leaderboardType === 'Tournament' && (
        <div className="flex justify-center mb-6">
          <div className="relative w-full max-w-md">
            <select
              value={selectedTournamentId || ''}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="w-full bg-surface/80 border border-white/20 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer font-bold tracking-wide"
            >
              {tournaments.length === 0 && <option value="" disabled>No tournaments available</option>}
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.game})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" size={18} />
          </div>
        </div>
      )}

      {/* AI Analytics Block */}
      <AnimatePresence>
        {!loading && leaderboard.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/50 border border-primary/30 rounded-xl p-4 flex gap-4 items-start shadow-[0_0_15px_rgba(0,255,63,0.1)]"
          >
            <div className="p-2 bg-primary/20 text-primary rounded-lg border border-primary/40 shrink-0">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                <Sparkles size={12} /> Sentinel AI Insights
              </h3>
              <p className="text-sm text-white/90 leading-relaxed font-mono">
                {getAiInsight()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center p-12 text-secondary">Decrypting ranking data...</div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-surface/80 border-b border-white/10 text-xs font-bold text-textMuted uppercase tracking-wider items-center">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-3">Operative</div>
              <div className="col-span-1 text-center" title="Total Ranking Points">Rating</div>
              <div className="col-span-1 text-center">Wins</div>
              <div className="col-span-1 text-center flex items-center justify-center gap-1"><Crosshair size={14}/> Kills</div>
              <div className="col-span-1 text-center flex items-center justify-center gap-1 text-accent"><Crown size={14}/> MVPs</div>
              <div className="col-span-2 text-center">Win Rate</div>
              <div className="col-span-2 text-center">Performance</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-white/5">
              {leaderboard.map((player, index) => {
                let rankStyle = "text-textMuted";
                let RankIcon = Award;
                
                if (index === 0) {
                  rankStyle = "text-yellow-400";
                  RankIcon = Trophy;
                } else if (index === 1) {
                  rankStyle = "text-gray-300";
                  RankIcon = Medal;
                } else if (index === 2) {
                  rankStyle = "text-amber-600";
                  RankIcon = Medal;
                }

                const perf = getPerformanceGrade(player);

                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={player.player_id} 
                    className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors ${index < 3 ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`col-span-1 flex justify-center items-center font-display font-bold text-xl ${rankStyle}`}>
                      {index < 3 ? <RankIcon size={24} /> : `#${index + 1}`}
                    </div>
                    <div className="col-span-3 font-bold text-white text-base flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs text-primary">{player.name.substring(0,2).toUpperCase()}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="truncate">{player.name}</span>
                        <RankBadge points={player.points} size="sm" />
                        {player.achievements && (
                          <div className="flex gap-1 mt-1">
                            {player.achievements.split(',').map((ach, i) => (
                              <span key={i} title={ach} className="inline-block w-4 h-4 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center text-[8px] text-primary">
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-center font-display font-bold text-primary text-lg">
                      {player.points}
                    </div>
                    <div className="col-span-1 text-center font-bold text-white">
                      {player.wins}
                    </div>
                    <div className="col-span-1 text-center font-mono font-bold text-white/80">
                      {player.kills}
                    </div>
                    <div className="col-span-1 text-center font-bold text-accent">
                      {player.mvps}
                    </div>
                    <div className="col-span-2 text-center font-bold text-white/90">
                      {((player.win_rate || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold border tracking-widest uppercase ${perf.color}`}>
                        {perf.grade}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {leaderboard.length === 0 && (
                <div className="p-8 text-center text-textMuted">
                  No ranking data available for this timeframe.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
