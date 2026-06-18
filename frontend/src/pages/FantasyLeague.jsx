import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import NeonCard from '../components/ui/NeonCard';
import { Trophy, Users, Plus, X, Shield, Activity, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

export default function FantasyLeague() {
  const { user } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFantasyData = async () => {
    try {
      // Fetch user's team
      if (user) {
        try {
          const teamRes = await api.get('/audience/fantasy/my-team');
          setTeam(teamRes.data);
        } catch (e) {
          if (e.response?.status === 404) {
            setTeam(null);
          }
        }
      }

      // Fetch global players (to draft from)
      const playersRes = await api.get('/ranking/leaderboard?limit=50');
      setAvailablePlayers(playersRes.data);

      // Fetch fantasy leaderboard
      const lbRes = await api.get('/audience/fantasy/leaderboard');
      setLeaderboard(lbRes.data);

    } catch (error) {
      console.error('Failed to fetch fantasy data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFantasyData();
  }, [user]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;
    try {
      await api.post('/audience/fantasy', { name: teamNameInput.trim() });
      toast.success('Fantasy Team created!');
      setTeamNameInput('');
      fetchFantasyData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleDraftPlayer = async (playerId) => {
    try {
      await api.post('/audience/fantasy/roster', { player_id: playerId });
      toast.success('Player drafted!');
      fetchFantasyData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to draft player');
    }
  };

  const handleRemovePlayer = async (playerId) => {
    try {
      await api.delete(`/audience/fantasy/roster/${playerId}`);
      toast.success('Player removed from roster');
      fetchFantasyData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove player');
    }
  };

  const getPlayerPrice = (mmr) => Math.max(500, Math.floor((mmr || 1000) / 10));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
      <PageHeader
        badge="Audience Interactive"
        title="Fantasy League"
        subtitle="Build your dream roster and compete against the global audience."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: My Team & Drafting */}
        <div className="lg:col-span-2 space-y-8">
          
          <NeonCard accent="cyan" className="p-6">
            {!user ? (
              <div className="text-center py-10 opacity-70">
                <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase text-white mb-2">Authentication Required</h3>
                <p className="text-sm text-textMuted">Log in to create and manage your Fantasy Team.</p>
              </div>
            ) : loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-surface rounded w-1/3"></div>
                <div className="h-24 bg-surface rounded"></div>
              </div>
            ) : !team ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase tracking-wider text-white mb-2">Create Your Franchise</h3>
                <p className="text-sm text-textMuted mb-6">Draft your roster of 5 elite players and earn points when they perform well in tournaments.</p>
                <form onSubmit={handleCreateTeam} className="flex gap-2 max-w-sm mx-auto">
                  <input
                    className="input-field flex-1"
                    placeholder="Franchise Name..."
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                  />
                  <button type="submit" className="btn-primary px-6" disabled={!teamNameInput.trim()}>Create</button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-2xl font-bold uppercase tracking-wider text-white font-display flex items-center gap-2">
                      <Shield className="text-primary w-6 h-6" /> {team.name}
                    </h3>
                    <div className="flex gap-4 mt-1">
                      <p className="text-sm text-textMuted">Total Points: <span className="text-neonGold font-bold">{team.score}</span></p>
                      <p className="text-sm text-textMuted border-l border-white/20 pl-4">Available Cap: <span className="text-green-400 font-bold">{team.budget_remaining} CR</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Roster Capacity</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-sm ${i < (team.roster?.length || 0) ? 'bg-primary' : 'bg-surface border border-white/20'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-bold uppercase text-gray-400 mb-4">Active Roster</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {team.roster?.length === 0 ? (
                    <p className="text-sm text-textMuted col-span-2 italic bg-surface/50 p-4 rounded-xl text-center border border-white/5">Your roster is empty. Draft players from the pool below.</p>
                  ) : (
                    team.roster.map(r => (
                      <div key={r.id} className="flex justify-between items-center bg-surface border border-white/10 p-3 rounded-xl hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-void flex items-center justify-center font-bold text-white border border-primary/20 shrink-0 overflow-hidden">
                            {r.player.avatar ? <img src={r.player.avatar} alt="avatar" className="w-full h-full object-cover" /> : r.player.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm truncate max-w-[120px]">{r.player.name}</p>
                            <div className="flex gap-2 items-center">
                              <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Pro Player</p>
                              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white">{getPlayerPrice(r.player.mmr)} CR</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemovePlayer(r.player_id)}
                          className="w-8 h-8 flex justify-center items-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          title="Drop Player"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </NeonCard>

          {team && (
            <NeonCard accent="magenta" className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                  <Users className="text-secondary w-5 h-5" /> Available Draft Pool
                </h3>
                <span className="text-xs bg-white/5 px-2 py-1 rounded text-textMuted">Top Global Rankers</span>
              </div>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {availablePlayers.map(lb => {
                  const player = { ...lb, id: lb.player_id, ranking_points: lb.rank_points };
                  const isDrafted = team.roster?.some(r => r.player_id === player.id);
                  return (
                    <div key={lb.player_id} className="flex justify-between items-center p-3 rounded-xl bg-surface border border-white/5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                          {player.avatar ? <img src={player.avatar} alt="avatar" className="w-full h-full object-cover" /> : player.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{player.name}</p>
                          <div className="flex gap-2 items-center">
                            <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">MMR: {player.ranking_points || player.mmr || 1000}</p>
                            <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold">{getPlayerPrice(player.ranking_points || player.mmr)} CR</span>
                          </div>
                        </div>
                      </div>
                      
                      {isDrafted ? (
                        <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">Drafted</span>
                      ) : (
                        <button 
                          onClick={() => handleDraftPlayer(player.id)}
                          disabled={team.roster?.length >= 5 || team.budget_remaining < getPlayerPrice(player.ranking_points || player.mmr)}
                          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" /> Draft
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </NeonCard>
          )}
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-1">
          <NeonCard accent="neonGold" className="p-6 sticky top-24">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
              <Star className="text-neonGold w-5 h-5" /> Global Rankings
            </h3>
            
            <div className="space-y-4">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-textMuted text-center py-4">No fantasy teams have scored points yet.</p>
              ) : (
                leaderboard.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                        idx === 0 ? 'bg-neonGold text-black' : 
                        idx === 1 ? 'bg-gray-300 text-black' : 
                        idx === 2 ? 'bg-yellow-700 text-white' : 'bg-surface text-gray-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate max-w-[120px] ${t.id === team?.id ? 'text-primary' : 'text-white'}`}>{t.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Owner ID: {t.user_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-display font-bold text-neonGold">{t.score.toFixed(1)}</span>
                      <span className="text-[10px] text-gray-500 ml-1">PTS</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </NeonCard>
        </div>

      </div>
    </div>
  );
}
