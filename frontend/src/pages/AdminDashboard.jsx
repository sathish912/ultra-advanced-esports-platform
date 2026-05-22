import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Users, Swords, Settings, Edit, Trash2, Trophy, Play, CheckCircle, XCircle, BarChart3, ShieldAlert, Sparkles, RefreshCw, Calendar, FileText, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('tournaments');

  // Tournaments State
  const [tournaments, setTournaments] = useState([]);
  const [editingTourney, setEditingTourney] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTourney, setNewTourney] = useState({ 
    name: '', 
    game: 'BGMI', 
    prize_pool: 1000, 
    max_players: 8, 
    entry_fee: 0,
    currency: 'INR',
    banner: 'http://localhost:8000/static/banners/mrgamer.png',
    rules: '',
    reg_start: '',
    match_day: '',
    match_type: 'Solo',
    status: 'Upcoming',
    stream_url: ''
  });

  // Registrations State
  const [registrations, setRegistrations] = useState([]);

  // Referee State
  const [selectedRefereeTId, setSelectedRefereeTId] = useState('');
  const [refMatches, setRefMatches] = useState([]);
  const [scoringMatch, setScoringMatch] = useState(null);
  const [scoringScores, setScoringScores] = useState({
    player1_score: 0,
    player2_score: 0,
    player1_kills: 0,
    player2_kills: 0,
    replay_url: ''
  });

  // Platform Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Security & Disputes State
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [disputedMatches, setDisputedMatches] = useState([]);

  const bannerOptions = [
    { name: 'Mr Gamer', url: 'http://localhost:8000/static/banners/mrgamer.png' },
    { name: 'BGMI', url: 'http://localhost:8000/static/banners/bgmi.png' },
    { name: 'Valorant', url: 'http://localhost:8000/static/banners/valorant.png' },
    { name: 'CS2', url: 'http://localhost:8000/static/banners/cs2.png' },
    { name: 'Free Fire', url: 'http://localhost:8000/static/banners/freefire.png' },
  ];

  useEffect(() => {
    fetchTournaments();
    fetchRegistrations();
    fetchAnalytics();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const res = await api.get('/registrations');
      setRegistrations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await api.get('/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchSecurityData = async () => {
    try {
      const [fRes, dRes] = await Promise.all([
        api.get('/admin/flagged_users'),
        api.get('/admin/disputes')
      ]);
      setFlaggedUsers(fRes.data);
      setDisputedMatches(dRes.data);
    } catch (err) {
      console.error('Failed to load security data', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityData();
    }
  }, [activeTab]);

  // Referee Matches
  useEffect(() => {
    if (selectedRefereeTId) {
      fetchRefereeMatches(selectedRefereeTId);
    } else {
      setRefMatches([]);
    }
  }, [selectedRefereeTId]);

  const fetchRefereeMatches = async (tId) => {
    try {
      const res = await api.get(`/matches?tournament_id=${tId}`);
      setRefMatches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tournaments', newTourney);
      setShowCreate(false);
      fetchTournaments();
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.detail || 'Tournament creation failed');
    }
  };

  const handleEditInit = (tourney) => {
    // Format dates to datetime-local friendly format
    const formatD = (dStr) => dStr ? dStr.substring(0, 16) : '';
    setEditingTourney({
      ...tourney,
      reg_start: formatD(tourney.reg_start),
      reg_end: formatD(tourney.reg_end),
      match_day: formatD(tourney.match_day)
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const { id, ...payload } = editingTourney;
      await api.patch(`/tournaments/${id}`, payload);
      setEditingTourney(null);
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update tournament');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to shut down and delete this battleground?")) return;
    try {
      await api.delete(`/tournaments/${id}`);
      fetchTournaments();
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  // Registration Actions
  const handleRegDecision = async (id, decision) => {
    try {
      await api.patch(`/registrations/${id}`, { status: decision });
      fetchRegistrations();
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.detail || 'Decision recording failed');
    }
  };

  // Schedule Brackets (Round 1)
  const handleScheduleRound1 = async (tId) => {
    try {
      await api.post(`/tournaments/${tId}/schedule`);
      alert("Round 1 pairings drawn successfully!");
      fetchTournaments();
      if (selectedRefereeTId === String(tId)) fetchRefereeMatches(tId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Pairings draw failed');
    }
  };

  // Draw Next Round Matchups
  const handleScheduleNextRound = async (tId) => {
    try {
      const res = await api.post(`/tournaments/${tId}/next-round`);
      alert(res.data.detail || "Next Round drawn!");
      fetchTournaments();
      fetchRefereeMatches(tId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Draw next matchups failed');
    }
  };

  // Referee Scoring submission
  const handleOpenScoring = (match) => {
    setScoringMatch(match);
    setScoringScores({
      player1_score: match.player1_score || 0,
      player2_score: match.player2_score || 0,
      player1_kills: match.player1_kills || 0,
      player2_kills: match.player2_kills || 0
    });
  };

  const handlePublishScore = async () => {
    if (scoringScores.player1_score === scoringScores.player2_score && scoringMatch.player2_id) {
      alert("Knockout matches cannot end in a draw. Declare a clear winner.");
      return;
    }
    try {
      await api.patch(`/matches/${scoringMatch.id}/result`, {
        match_status: 'Completed',
        player1_score: Number(scoringScores.player1_score),
        player2_score: Number(scoringScores.player2_score),
        player1_kills: Number(scoringScores.player1_kills),
        player2_kills: Number(scoringScores.player2_kills)
      });
      setScoringMatch(null);
      fetchRefereeMatches(selectedRefereeTId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Score publication failed');
    }
  };

  // Divide matches into rounds
  const matchesByRound = {};
  refMatches.forEach(m => {
    if (!matchesByRound[m.round]) {
      matchesByRound[m.round] = [];
    }
    matchesByRound[m.round].push(m);
  });

  const handleResolveDispute = async (id) => {
    try {
      await api.patch(`/matches/${id}/resolve-dispute`);
      fetchSecurityData();
    } catch (err) {
      alert("Failed to resolve dispute");
    }
  };

  const handleClearFlag = async (id) => {
    try {
      await api.patch(`/users/${id}/unflag`);
      fetchSecurityData();
    } catch (err) {
      alert("Failed to clear flag");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      {/* Command Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-3">
            <Settings className="text-primary animate-spin" style={{ animationDuration: '6s' }} size={32} />
            Cyber Command Center
          </h1>
          <p className="text-textMuted font-mono text-sm">System Admin Dashboard • Access Level: Root</p>
        </div>
      </div>

      {/* Modern Dashboard Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
        {[
          { id: 'tournaments', label: 'Operations', icon: Swords },
          { id: 'registrations', label: 'Registrations', icon: Users },
          { id: 'referee', label: 'Referee Desk', icon: Trophy },
          { id: 'analytics', label: 'Analytics Panel', icon: BarChart3 },
          { id: 'security', label: 'Security & Disputes', icon: ShieldAlert },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-display font-bold uppercase tracking-wider border-b-2 text-sm transition-all duration-300 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-textMuted hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        
        {/* --- TAB 1: TOURNAMENT OPERATIONS --- */}
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">Tournament Database</h3>
              <button 
                onClick={() => setShowCreate(!showCreate)} 
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
              >
                <Plus size={16} /> Create Battleground
              </button>
            </div>

            {/* Create form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-panel p-6 rounded-2xl border border-primary/20 bg-surface/30 overflow-hidden"
                >
                  <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                    <Sparkles className="text-primary" size={18} /> Initialize Deploy File
                  </h3>
                  <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Combat Name</label>
                      <input type="text" className="input-field" required value={newTourney.name} onChange={e => setNewTourney({...newTourney, name: e.target.value})} placeholder="e.g. Valorant Legends Cup" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Combat Game</label>
                      <select className="input-field bg-background cursor-pointer" required value={newTourney.game} onChange={e => setNewTourney({...newTourney, game: e.target.value})}>
                        <option value="BGMI">BGMI</option>
                        <option value="Valorant">Valorant</option>
                        <option value="CS2">CS2</option>
                        <option value="Free Fire">Free Fire</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Combat Type</label>
                      <select className="input-field bg-background cursor-pointer" required value={newTourney.match_type} onChange={e => setNewTourney({...newTourney, match_type: e.target.value})}>
                        <option value="Solo">Solo</option>
                        <option value="Duo">Duo</option>
                        <option value="Squad">Squad</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Banner Preset</label>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {bannerOptions.map(b => (
                          <button 
                            key={b.name} 
                            type="button" 
                            onClick={() => setNewTourney({...newTourney, banner: b.url, game: b.name === 'Mr Gamer' ? 'BGMI' : b.name})}
                            className={`flex-shrink-0 w-28 h-16 rounded-xl border-2 transition-all overflow-hidden ${
                              newTourney.banner === b.url ? 'border-primary shadow-[0_0_12px_rgba(0,255,63,0.3)] scale-95' : 'border-white/10 opacity-50 hover:opacity-100'
                            }`}
                          >
                            <img src={b.url} alt={b.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Prize Reward Pool</label>
                      <input type="number" className="input-field" required value={newTourney.prize_pool} onChange={e => { const pp = Number(e.target.value); setNewTourney({...newTourney, prize_pool: pp, entry_fee: pp * 0.1}); }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Max Target Operatives</label>
                      <input type="number" className="input-field" required value={newTourney.max_players} onChange={e => setNewTourney({...newTourney, max_players: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Entry Fee (Token)</label>
                      <input type="number" className="input-field" required value={newTourney.entry_fee} onChange={e => setNewTourney({...newTourney, entry_fee: Number(e.target.value)})} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Registration Lock-in</label>
                      <input type="datetime-local" className="input-field" required value={newTourney.reg_start} onChange={e => setNewTourney({...newTourney, reg_start: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Registration Cut-off</label>
                      <input type="datetime-local" className="input-field" required value={newTourney.reg_end} onChange={e => {
                        const newRegEnd = e.target.value;
                        let newMatchDay = newTourney.match_day;
                        if (newRegEnd) {
                          const d = new Date(newRegEnd);
                          d.setDate(d.getDate() + 7);
                          const offset = d.getTimezoneOffset() * 60000;
                          newMatchDay = (new Date(d - offset)).toISOString().slice(0, 16);
                        }
                        setNewTourney({...newTourney, reg_end: newRegEnd, match_day: newMatchDay});
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Deployment Match Day</label>
                      <input type="datetime-local" className="input-field" required value={newTourney.match_day} onChange={e => setNewTourney({...newTourney, match_day: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Stream URL (Optional)</label>
                      <input type="text" className="input-field" value={newTourney.stream_url || ''} onChange={e => setNewTourney({...newTourney, stream_url: e.target.value})} placeholder="https://twitch.tv/..." />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-textMuted uppercase mb-1.5">Platform Rules & Ruleset</label>
                      <textarea className="input-field min-h-[80px] py-2" placeholder="Detail standard operational protocols..." value={newTourney.rules} onChange={e => setNewTourney({...newTourney, rules: e.target.value})} />
                    </div>

                    <div className="md:col-span-3 flex justify-end gap-3 pt-3">
                      <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary py-2 px-5 text-sm">Abandond</button>
                      <button type="submit" className="btn-primary py-2 px-5 text-sm">Deploy</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editing Tournament Modal */}
            <AnimatePresence>
              {editingTourney && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-primary/40 bg-surface/95 max-h-[90vh] overflow-y-auto"
                  >
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-5 flex justify-between items-center border-b border-white/10 pb-3">
                      <span>Update Protocols: {editingTourney.name}</span>
                      <button onClick={() => setEditingTourney(null)} className="text-textMuted hover:text-white"><XCircle size={20} /></button>
                    </h3>
                    <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Name</label>
                        <input type="text" className="input-field" required value={editingTourney.name} onChange={e => setEditingTourney({...editingTourney, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Combat Game</label>
                        <select className="input-field bg-background" required value={editingTourney.game} onChange={e => setEditingTourney({...editingTourney, game: e.target.value})}>
                          <option value="BGMI">BGMI</option>
                          <option value="Valorant">Valorant</option>
                          <option value="CS2">CS2</option>
                          <option value="Free Fire">Free Fire</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Combat Status</label>
                        <select className="input-field bg-background border-primary/50 text-primary font-semibold" required value={editingTourney.status} onChange={e => setEditingTourney({...editingTourney, status: e.target.value})}>
                          <option value="Upcoming">Upcoming</option>
                          <option value="Registration Open">Registration Open</option>
                          <option value="Ongoing">Ongoing</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Prize Reward</label>
                        <input type="number" className="input-field" required value={editingTourney.prize_pool} onChange={e => { const pp = Number(e.target.value); setEditingTourney({...editingTourney, prize_pool: pp, entry_fee: pp * 0.1}); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Max Targets</label>
                        <input type="number" className="input-field" required value={editingTourney.max_players} onChange={e => setEditingTourney({...editingTourney, max_players: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Entry Fee</label>
                        <input type="number" className="input-field" required value={editingTourney.entry_fee} onChange={e => setEditingTourney({...editingTourney, entry_fee: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Reg Lock-in</label>
                        <input type="datetime-local" className="input-field" required value={editingTourney.reg_start} onChange={e => setEditingTourney({...editingTourney, reg_start: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Reg Cut-off</label>
                        <input type="datetime-local" className="input-field" required value={editingTourney.reg_end} onChange={e => {
                          const newRegEnd = e.target.value;
                          let newMatchDay = editingTourney.match_day;
                          if (newRegEnd) {
                            const d = new Date(newRegEnd);
                            d.setDate(d.getDate() + 7);
                            const offset = d.getTimezoneOffset() * 60000;
                            newMatchDay = (new Date(d - offset)).toISOString().slice(0, 16);
                          }
                          setEditingTourney({...editingTourney, reg_end: newRegEnd, match_day: newMatchDay});
                        }} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Deployment Match Day</label>
                        <input type="datetime-local" className="input-field" required value={editingTourney.match_day} onChange={e => setEditingTourney({...editingTourney, match_day: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Stream URL</label>
                        <input type="text" className="input-field" value={editingTourney.stream_url || ''} onChange={e => setEditingTourney({...editingTourney, stream_url: e.target.value})} placeholder="https://twitch.tv/..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-textMuted uppercase mb-1">Rules</label>
                        <textarea className="input-field min-h-[80px]" value={editingTourney.rules || ''} onChange={e => setEditingTourney({...editingTourney, rules: e.target.value})} />
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setEditingTourney(null)} className="btn-secondary py-2 px-5">Cancel</button>
                        <button type="submit" className="btn-primary py-2 px-5">Publish updates</button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* List tournaments */}
            <div className="grid grid-cols-1 gap-4">
              {tournaments.map(t => (
                <div key={t.id} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between group border border-white/5 bg-surface/20 hover:border-primary/20 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-12 bg-surface rounded-xl flex items-center justify-center border border-white/10 overflow-hidden relative">
                      {t.banner ? (
                        <img src={t.banner} alt="banner" className="w-full h-full object-cover" />
                      ) : (
                        <Swords size={20} className="text-secondary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{t.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-textMuted mt-1">
                        <span className="font-semibold uppercase tracking-wider text-accent">{t.game}</span>
                        <span>•</span>
                        <span className="text-primary font-bold">₹{t.prize_pool}</span>
                        <span>•</span>
                        <span>{t.match_type} Matchup</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          t.status === 'Ongoing' ? 'bg-accent/10 text-accent border border-accent/20 animate-pulse' : 'bg-surface border border-white/10'
                        }`}>{t.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 md:mt-0">
                    {t.status === 'Registration Open' && (
                      <button 
                        onClick={() => handleScheduleRound1(t.id)}
                        className="py-1.5 px-3 rounded-lg text-xs bg-accent/20 text-accent hover:bg-accent/30 border border-accent/40 font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Play size={12} /> Draw Bracket
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleEditInit(t)}
                      className="p-2.5 bg-surface hover:bg-white/10 rounded-xl border border-white/10 text-white transition-colors cursor-pointer" 
                      title="Edit Protocols"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      className="p-2.5 bg-surface hover:bg-red-500/20 rounded-xl border border-white/10 text-red-500 hover:border-red-500/30 transition-colors cursor-pointer" 
                      title="Shutdown Lobbies"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {tournaments.length === 0 && (
                <div className="text-center py-12 text-textMuted border border-dashed border-white/10 rounded-2xl font-semibold">
                  Platform contains no deployment matrices. Create one above!
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: REGISTRATION INTAKE --- */}
        {activeTab === 'registrations' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Operatives Registration Intake</h3>
            
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 bg-surface/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background/80 text-textMuted uppercase font-bold tracking-wider text-xs border-b border-white/10">
                    <tr>
                      <th className="p-4 font-semibold">Operative</th>
                      <th className="p-4 font-semibold">Target Tournament</th>
                      <th className="p-4 font-semibold">Points Balance</th>
                      <th className="p-4 font-semibold">Role Status</th>
                      <th className="p-4 font-semibold">Decisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {registrations.map(reg => (
                      <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold font-display uppercase">
                            {reg.user?.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-white">
                              {reg.user?.name}
                              {reg.user?.is_flagged && <Flag size={14} className="text-red-500 fill-red-500" title="Flagged Operative" />}
                            </p>
                            <p className="text-xs text-textMuted font-mono font-medium">{reg.user?.email}</p>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-white/80">{reg.tournament?.name || 'Tournament'}</td>
                        <td className="p-4 text-primary font-bold">{reg.user?.ranking_points} RP</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                            reg.registration_status === 'Approved' 
                              ? 'bg-primary/10 text-primary border-primary/30' 
                              : reg.registration_status === 'Rejected'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 animate-pulse'
                          }`}>
                            {reg.registration_status}
                          </span>
                        </td>
                        <td className="p-4">
                          {reg.registration_status === 'Pending' ? (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleRegDecision(reg.id, 'Approved')}
                                className="py-1 px-2.5 rounded-lg text-xs bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button 
                                onClick={() => handleRegDecision(reg.id, 'Rejected')}
                                className="py-1 px-2.5 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-textMuted">Closed Protocol</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {registrations.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-textMuted font-medium">
                          No registration queues active.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: REFEREE & BRACKETS --- */}
        {activeTab === 'referee' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">Referee Scoring Console</h3>
              
              {/* Tournament Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-textMuted uppercase whitespace-nowrap">Select Arena:</span>
                <select 
                  value={selectedRefereeTId} 
                  onChange={(e) => setSelectedRefereeTId(e.target.value)}
                  className="bg-surface/80 border border-white/10 rounded-xl px-4 py-2 text-white font-semibold text-sm focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="">-- Choose Arena --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRefereeTId ? (
              <div className="space-y-6 border-t border-white/5 pt-6">
                
                {/* Advanced Brackets Drawing Action */}
                <div className="flex justify-between items-center bg-surface/10 p-4 rounded-xl border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Knockout Matchup Controller</h4>
                    <p className="text-xs text-textMuted mt-1">Initialize next draw when all rounds in the active hierarchy are marked complete.</p>
                  </div>
                  <button
                    onClick={() => handleScheduleNextRound(selectedRefereeTId)}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                  >
                    <Trophy size={16} /> Draw Next Round Matches
                  </button>
                </div>

                {/* Brackets Visual rounds list */}
                {Object.keys(matchesByRound).length === 0 ? (
                  <div className="text-center py-12 glass-panel rounded-2xl text-textMuted">
                    No matches scheduled for this deploy file yet. Transition status or draw bracket first.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b)).map(round => (
                      <div key={round} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
                          <h4 className="font-display font-bold text-white uppercase tracking-widest text-sm">Round {round} bracket pairings</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {matchesByRound[round].map(m => {
                            const isBye = m.scores === 'Bye' || !m.player2_id;
                            return (
                              <div 
                                key={m.id} 
                                className={`glass-panel p-4 rounded-2xl border transition-all ${
                                  m.match_status === 'Completed'
                                    ? 'bg-surface/10 border-white/5 opacity-70'
                                    : 'bg-surface/30 border-white/10 hover:border-primary/20 shadow-[0_0_10px_rgba(0,255,63,0.05)]'
                                }`}
                              >
                                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                                  <span className="text-[10px] text-textMuted uppercase font-semibold">Match ID: #{m.id}</span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    m.match_status === 'Completed' 
                                      ? 'bg-surface text-textMuted' 
                                      : m.match_status === 'Ongoing'
                                      ? 'bg-accent/10 text-accent animate-pulse'
                                      : 'bg-primary/10 text-primary'
                                  }`}>{m.match_status}</span>
                                </div>
                                
                                <div className="space-y-2">
                                  {/* Player 1 */}
                                  <div className="flex justify-between items-center p-2 rounded-lg bg-background/40">
                                    <span className={`font-bold flex items-center gap-1 text-sm ${m.winner_id === m.player1_id && m.match_status === 'Completed' ? 'text-primary' : 'text-white'}`}>
                                      {m.player1?.name || 'Unknown'}
                                      {m.player1?.is_flagged && <Flag size={12} className="text-red-500 fill-red-500" />}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-textMuted">{m.player1_score}</span>
                                  </div>
                                  
                                  {/* Player 2 */}
                                  <div className="flex justify-between items-center p-2 rounded-lg bg-background/40">
                                    <span className={`font-bold flex items-center gap-1 text-sm ${m.winner_id === m.player2_id && m.match_status === 'Completed' ? 'text-primary' : 'text-white'}`}>
                                      {isBye ? 'Bye (Automatic Winner)' : m.player2?.name || 'TBD'}
                                      {m.player2?.is_flagged && <Flag size={12} className="text-red-500 fill-red-500" />}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-textMuted">{isBye ? '-' : m.player2_score}</span>
                                  </div>
                                </div>

                                {m.match_status !== 'Completed' && (
                                  <button
                                    onClick={() => handleOpenScoring(m)}
                                    className="w-full mt-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40 rounded-xl text-xs font-bold uppercase transition-all tracking-wider cursor-pointer"
                                  >
                                    Declare Scores
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-16 text-textMuted font-medium glass-panel rounded-2xl">
                Choose an ongoing battle arena above to activate the referee terminal.
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: PLATFORM ANALYTICS --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">System Analytics Intel</h3>
              <button 
                onClick={fetchAnalytics}
                disabled={loadingAnalytics}
                className="glass-panel p-2.5 rounded-xl border border-white/10 hover:border-primary/50 text-white cursor-pointer transition-all"
              >
                <RefreshCw size={16} className={loadingAnalytics ? 'animate-spin' : ''} />
              </button>
            </div>

            {analytics ? (
              <div className="space-y-8">
                {/* Stats cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 rounded-2xl bg-surface/30 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20"><Users size={20} /></div>
                    <div>
                      <p className="text-xs text-textMuted uppercase font-bold tracking-wider">Competitors</p>
                      <p className="text-2xl font-bold text-white mt-0.5">{analytics.total_players}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-5 rounded-2xl bg-surface/30 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 text-secondary rounded-xl border border-secondary/20"><Swords size={20} /></div>
                    <div>
                      <p className="text-xs text-textMuted uppercase font-bold tracking-wider">Lobbies</p>
                      <p className="text-2xl font-bold text-white mt-0.5">{analytics.total_tournaments}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-5 rounded-2xl bg-surface/30 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl border border-accent/20"><Play size={20} /></div>
                    <div>
                      <p className="text-xs text-textMuted uppercase font-bold tracking-wider">Active Lobbies</p>
                      <p className="text-2xl font-bold text-white mt-0.5">{analytics.active_matches}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-5 rounded-2xl bg-surface/30 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-xl border border-yellow-500/20"><FileText size={20} /></div>
                    <div>
                      <p className="text-xs text-textMuted uppercase font-bold tracking-wider">Total Matchups</p>
                      <p className="text-2xl font-bold text-white mt-0.5">{analytics.total_matches}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status splits */}
                  <div className="glass-panel p-6 rounded-2xl bg-surface/20 border border-white/5 space-y-4">
                    <h4 className="font-bold text-white uppercase tracking-wider text-sm border-b border-white/5 pb-2">Arena Operational Status</h4>
                    <div className="space-y-3">
                      {Object.entries(analytics.tournaments_by_status).map(([status, val]) => (
                        <div key={status} className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">{status}</span>
                          <span className="font-bold text-white bg-surface px-2.5 py-0.5 border border-white/10 rounded">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Games splited */}
                  <div className="glass-panel p-6 rounded-2xl bg-surface/20 border border-white/5 space-y-4">
                    <h4 className="font-bold text-white uppercase tracking-wider text-sm border-b border-white/5 pb-2">Game Deployment Popularity</h4>
                    <div className="space-y-3">
                      {Object.keys(analytics.games_popularity).length === 0 ? (
                        <p className="text-xs text-textMuted">No active arenas deployed.</p>
                      ) : (
                        Object.entries(analytics.games_popularity).map(([game, val]) => (
                          <div key={game} className="flex justify-between items-center text-sm">
                            <span className="text-textMuted font-bold uppercase">{game}</span>
                            <span className="font-bold text-primary bg-primary/5 px-2.5 py-0.5 border border-primary/20 rounded">{val} arena</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-textMuted font-medium glass-panel rounded-2xl">
                Analytics terminal offline. Check server uvicorn thread.
              </div>
            )}
          </div>
        )}

        {/* --- TAB 5: SECURITY & DISPUTES --- */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Security & Disputes</h3>
            
            {/* Disputed Matches */}
            <div className="glass-panel p-6 rounded-2xl bg-surface/20 border border-white/5 space-y-4">
              <h4 className="font-bold text-white uppercase tracking-wider text-sm border-b border-white/5 pb-2 text-red-400">Active Match Disputes</h4>
              {disputedMatches.length === 0 ? (
                <p className="text-sm text-textMuted py-4">No active disputes.</p>
              ) : (
                <div className="space-y-4">
                  {disputedMatches.map(m => (
                    <div key={m.id} className="bg-surface/30 border border-red-500/20 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="text-xs font-bold text-red-500 uppercase">Match #{m.id}</span>
                        <p className="text-white font-bold mt-1 flex items-center gap-1">
                          {m.player1?.name || 'Unknown'} {m.player1?.is_flagged && <Flag size={14} className="text-red-500 fill-red-500" />}
                          <span className="text-textMuted font-normal text-xs mx-1">vs</span>
                          {m.player2?.name || 'Unknown'} {m.player2?.is_flagged && <Flag size={14} className="text-red-500 fill-red-500" />}
                        </p>
                        <p className="text-sm text-textMuted mt-1 bg-red-500/10 border border-red-500/20 p-2 rounded">
                          <span className="font-bold text-red-400">Dispute Reason:</span> {m.dispute_reason}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleResolveDispute(m.id)}
                        className="btn-primary py-1.5 px-4 text-xs shrink-0"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flagged Users */}
            <div className="glass-panel p-6 rounded-2xl bg-surface/20 border border-white/5 space-y-4">
              <h4 className="font-bold text-white uppercase tracking-wider text-sm border-b border-white/5 pb-2 text-yellow-400">Flagged Operatives</h4>
              {flaggedUsers.length === 0 ? (
                <p className="text-sm text-textMuted py-4">No flagged operatives.</p>
              ) : (
                <div className="space-y-4">
                  {flaggedUsers.map(u => (
                    <div key={u.id} className="bg-surface/30 border border-yellow-500/20 p-4 rounded-xl flex justify-between items-center gap-4">
                      <div>
                        <p className="text-white font-bold flex items-center gap-1">
                          {u.name} <Flag size={14} className="text-red-500 fill-red-500" title="Flagged Operative" />
                        </p>
                        <p className="text-sm text-textMuted">{u.email}</p>
                      </div>
                      <button 
                        onClick={() => handleClearFlag(u.id)}
                        className="btn-secondary py-1.5 px-4 text-xs"
                      >
                        Clear Flag
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- SCORING DECLARE MODAL --- */}
      <AnimatePresence>
        {scoringMatch && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel max-w-md w-full p-6 rounded-2xl border border-primary/40 bg-surface/95"
            >
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-5 flex justify-between items-center border-b border-white/10 pb-3">
                <span>Declare Combat Log</span>
                <button onClick={() => setScoringMatch(null)} className="text-textMuted hover:text-white"><XCircle size={18} /></button>
              </h3>
              
              <div className="space-y-4">
                {/* Competitor 1 */}
                <div className="bg-background/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <p className="font-bold text-white text-sm">{scoringMatch.player1?.name || 'Player 1'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-textMuted uppercase mb-1">Score Matches</label>
                      <input 
                        type="number" 
                        className="input-field py-1.5 px-3 text-sm font-semibold"
                        value={scoringScores.player1_score === 0 ? '' : scoringScores.player1_score}
                        onChange={(e) => setScoringScores({...scoringScores, player1_score: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-textMuted uppercase mb-1">Frags / Kills</label>
                      <input 
                        type="number" 
                        className="input-field py-1.5 px-3 text-sm font-semibold"
                        value={scoringScores.player1_kills === 0 ? '' : scoringScores.player1_kills}
                        onChange={(e) => setScoringScores({...scoringScores, player1_kills: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Competitor 2 */}
                {scoringMatch.player2_id && (
                  <div className="bg-background/50 p-4 rounded-xl border border-white/5 space-y-3">
                    <p className="font-bold text-white text-sm">{scoringMatch.player2?.name || 'Player 2'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-textMuted uppercase mb-1">Score Matches</label>
                        <input 
                          type="number" 
                          className="input-field py-1.5 px-3 text-sm font-semibold"
                          value={scoringScores.player2_score === 0 ? '' : scoringScores.player2_score}
                          onChange={(e) => setScoringScores({...scoringScores, player2_score: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-textMuted uppercase mb-1">Frags / Kills</label>
                        <input 
                          type="number" 
                          className="input-field py-1.5 px-3 text-sm font-semibold"
                          value={scoringScores.player2_kills === 0 ? '' : scoringScores.player2_kills}
                          onChange={(e) => setScoringScores({...scoringScores, player2_kills: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-background/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="block text-[10px] font-bold text-textMuted uppercase mb-1">VOD / Replay URL (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field py-1.5 px-3 text-sm font-semibold"
                    placeholder="https://youtube.com/watch?v=..."
                    value={scoringScores.replay_url || ''}
                    onChange={(e) => setScoringScores({...scoringScores, replay_url: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-3">
                  <button onClick={() => setScoringMatch(null)} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
                  <button onClick={handlePublishScore} className="btn-primary py-2 px-5 text-sm">Publish scores</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
