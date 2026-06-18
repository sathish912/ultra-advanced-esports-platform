import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Swords, Trophy, Activity, Medal, Bell, X, Check, Calendar, Crosshair, Sparkles, LogIn, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function PlayerDashboard() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [myTournaments, setMyTournaments] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [tournamentsMap, setTournamentsMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [ownedClan, setOwnedClan] = useState(null);
  const [clanRequests, setClanRequests] = useState([]);
  const wsRef = useRef(null);

  const fetchMatches = async () => {
    try {
      setMatchFetchStatus("fetching");
      const res = await api.get('/matches');
      setMatchFetchStatus("fetched:" + res.data.length);
      setAllMatches(res.data);
    } catch (err) {
      setMatchFetchStatus("error:" + err.message);
      console.error('Error fetching matches:', err);
    }
  };

  const fetchUserData = async () => {
    try {
      const [pRes, tRes, allTRes, clansRes] = await Promise.all([
        api.get('/profile'),
        api.get('/my-tournaments'),
        api.get('/tournaments'),
        api.get('/clans')
      ]);
      setProfile(pRes.data);
      setUser(pRes.data); // Update Auth context
      setMyTournaments(tRes.data);
      
      // Map tournaments for ID lookup
      const mapping = {};
      allTRes.data.forEach(t => {
        mapping[t.id] = t;
      });
      setTournamentsMap(mapping);
      
      // Check if user owns a clan
      const userClan = clansRes.data.find(c => c.leader_id === pRes.data.id);
      if (userClan) {
        setOwnedClan(userClan);
        api.get(`/clans/${userClan.id}/requests`).then(reqs => {
          setClanRequests(reqs.data);
        }).catch(err => console.error("Error fetching clan requests:", err));
      }

      fetchMatches();
    } catch (err) {
      console.error('Error fetching player metadata:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const showToast = (notif) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...notif }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    fetchUserData();
    fetchNotifications();
    
    // Connect WebSocket
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' && data.user_id === user.id) {
          // Add notification to state
          setNotifications(prev => [data.notification, ...prev]);
          // Add toast alert
          showToast(data.notification);
          // Refresh user data (points or registration state might have changed)
          fetchUserData();
        } else if (data.type === 'match_completed' || data.type === 'matches_scheduled' || data.type === 'next_round_scheduled') {
          // Refresh matches if relevant to active tournaments
          fetchMatches();
          fetchUserData();
        }
      } catch (err) {
        console.error('WS parsing error:', err);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const [matchFetchStatus, setMatchFetchStatus] = useState("pending");

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
      showToast({ title: "Error", message: "Failed to mark all as read." });
    }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      await api.post(`/clans/requests/${reqId}/accept`);
      setClanRequests(prev => prev.filter(r => r.id !== reqId));
      showToast({ title: "Request Accepted", message: "Player has joined your squad!" });
    } catch (err) {
      console.error(err);
      showToast({ title: "Error", message: "Failed to accept request." });
    }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      await api.post(`/clans/requests/${reqId}/reject`);
      setClanRequests(prev => prev.filter(r => r.id !== reqId));
      showToast({ title: "Request Rejected", message: "Player application denied." });
    } catch (err) {
      console.error(err);
      showToast({ title: "Error", message: "Failed to reject request." });
    }
  };

  const submitDispute = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/matches/${selectedMatch.id}/dispute`, { reason: disputeReason });
      setDisputeModalOpen(false);
      setDisputeReason("");
      showToast({ title: "Dispute Submitted", message: "Admins have been notified." });
      fetchMatches();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Filter player-specific matches
  const playerMatches = allMatches.filter(m => Number(m.player1_id) === Number(profile.id) || Number(m.player2_id) === Number(profile.id));
  const activeMatches = playerMatches.filter(m => m.match_status !== 'Completed');
  const completedMatches = playerMatches.filter(m => m.match_status === 'Completed');

  const totalMatchesCount = profile.wins + profile.losses;

  const winRate = totalMatchesCount > 0 ? ((profile.wins / totalMatchesCount) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 relative">
      
      {/* Visual Toasts container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="glass-panel p-4 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(0,255,63,0.3)] bg-background/95 flex gap-3 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 h-1 bg-primary w-full animate-[shrink_5s_linear_forwards]" />
              <div className="p-2 bg-primary/20 rounded-lg text-primary h-fit">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{t.title}</p>
                <p className="text-textMuted text-xs mt-1">{t.message}</p>
              </div>
              <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-textMuted hover:text-white transition-colors h-fit self-start">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 h-48 border border-white/10 shadow-[0_0_30px_rgba(0,255,63,0.1)] group">
        <img 
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80" 
          alt="Gaming Banner" 
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        
        <div className="relative z-10 h-full flex flex-col md:flex-row md:items-center justify-between p-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-3 shadow-black drop-shadow-xl">
              <Swords className="text-primary animate-pulse shadow-primary drop-shadow-xl" size={40} />
              Player Headquarters
            </h1>
            <p className="text-textMuted max-w-xl text-lg drop-shadow-md">
              Welcome back, Agent <span className="text-primary font-bold">{profile.name}</span>. Monitor your active campaigns and ratings.
            </p>
          </div>
          
          {/* Alerts Bell */}
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="relative glass-panel bg-background/50 backdrop-blur-md p-4 rounded-xl border border-white/10 hover:border-primary/50 text-white transition-all cursor-pointer flex items-center gap-3 group mt-4 md:mt-0"
          >
            <Bell size={24} className="group-hover:rotate-12 transition-transform text-primary" />
            <span className="text-sm uppercase font-bold tracking-wider hidden sm:inline">Alert Feed</span>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-background animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Earned Accolades */}
      {profile.achievements && profile.achievements.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {profile.achievements.split(',').map((ach, idx) => (
            <div key={idx} className="glass-panel px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-2 shadow-[0_0_10px_rgba(250,204,21,0.1)]">
              <Sparkles size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400 uppercase tracking-widest">{ach.trim()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cyber Career Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-white/5 bg-surface/30">
          <div className="p-3.5 bg-primary/10 rounded-xl text-primary border border-primary/20"><Activity size={24} /></div>
          <div>
            <p className="text-textMuted text-xs font-semibold uppercase tracking-wider">Ranking Points</p>
            <p className="text-2xl font-bold text-white mt-1 shadow-sm">{profile.ranking_points} <span className="text-xs text-primary font-medium">pts</span></p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-white/5 bg-surface/30">
          <div className="p-3.5 bg-secondary/10 rounded-xl text-secondary border border-secondary/20"><Trophy size={24} /></div>
          <div>
            <p className="text-textMuted text-xs font-semibold uppercase tracking-wider">Combat Win Rate</p>
            <p className="text-2xl font-bold text-white mt-1">{winRate}% <span className="text-xs text-textMuted font-medium">({profile.wins}W / {profile.losses}L)</span></p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-white/5 bg-surface/30">
          <div className="p-3.5 bg-accent/10 rounded-xl text-accent border border-accent/20"><Crosshair size={24} /></div>
          <div>
            <p className="text-textMuted text-xs font-semibold uppercase tracking-wider">Career Frag Count</p>
            <p className="text-2xl font-bold text-white mt-1">{profile.kills} <span className="text-xs text-accent font-medium">Kills</span></p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-white/5 bg-surface/30">
          <div className="p-3.5 bg-yellow-500/10 rounded-xl text-yellow-400 border border-yellow-500/20"><Medal size={24} /></div>
          <div>
            <p className="text-textMuted text-xs font-semibold uppercase tracking-wider">MVP Declarations</p>
            <p className="text-2xl font-bold text-white mt-1">{profile.mvps} <span className="text-xs text-yellow-400 font-medium">MVP</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* My Registered Tournaments */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Trophy size={18} className="text-secondary" />
              Active Campaigns
            </h2>
            {myTournaments.length === 0 ? (
              <div className="glass-panel p-12 rounded-xl text-center border border-white/5">
                <Swords size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-textMuted text-lg font-semibold">No deployment files found.</p>
                <p className="text-sm mt-2 text-white/40">Open the Scrims database and enlist in a battleground.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTournaments.map(t => (
                  <div key={t.id} className="glass-panel rounded-xl overflow-hidden group border border-white/5 bg-surface/20">
                    <div className="h-28 bg-surface/80 relative flex items-center justify-center overflow-hidden border-b border-white/5">
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
                      {t.banner ? (
                        <img src={t.banner} alt={t.name} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Swords size={48} className="text-primary/10 group-hover:scale-110 group-hover:text-primary/30 transition-all duration-500 z-0" />
                      )}
                      <span className="absolute bottom-2 right-2 text-xs font-bold px-2.5 py-1 bg-background/80 border border-white/10 rounded-md z-20 text-white">
                        {t.game}
                      </span>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-white text-lg mb-1 leading-tight group-hover:text-primary transition-colors">{t.name}</h4>
                      <p className={`text-xs mb-4 uppercase tracking-wider font-bold ${
                        t.status === 'Ongoing' ? 'text-accent animate-pulse' : 'text-textMuted'
                      }`}>{t.status}</p>
                      
                      <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
                        <span className="text-textMuted">Prize Reward</span>
                        <span className="text-primary font-bold">₹{t.prize_pool}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Clan Requests Widget */}
            {ownedClan && clanRequests.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <Users size={18} className="text-primary" /> {/* Note: Assuming Users is imported or using LogIn */}
                  Clan Applications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clanRequests.map(r => (
                    <div key={r.id} className="glass-panel p-4 rounded-xl border border-white/5 bg-surface/30 flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold text-sm">{r.user?.name}</p>
                        <span className="text-[10px] text-textMuted uppercase tracking-wider">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAcceptRequest(r.id)} 
                          className="bg-green-500/20 hover:bg-green-500/40 text-green-500 border border-green-500/50 p-2 rounded cursor-pointer transition-colors"
                          title="Accept"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(r.id)} 
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500/50 p-2 rounded cursor-pointer transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live and Upcoming Matches */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Crosshair size={18} className="text-primary" />
              Assigned Engagements
            </h2>

            {/* Scheduled Matches */}
            <div className="space-y-3">
              <p className="text-xs text-textMuted uppercase font-bold tracking-widest mb-2">Upcoming Scrims ({activeMatches.length})</p>
              {activeMatches.length === 0 ? (
                <div className="p-6 text-center text-textMuted glass-panel rounded-xl text-sm border border-white/5">
                  No pending match conflicts listed on terminal.
                </div>
              ) : (
                activeMatches.map(m => {
                  const t = tournamentsMap[m.tournament_id];
                  const opponent = m.player1_id === profile.id ? m.player2 : m.player1;
                  const myNum = m.player1_id === profile.id ? 1 : 2;
                  
                  return (
                    <div key={m.id} className="glass-panel p-4 rounded-xl border border-white/5 bg-surface/30 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-primary font-semibold uppercase">{t?.name || 'Tournament'}</span>
                        <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-bold">Round {m.round}</span>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-white/5 pt-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-textMuted">Competitor</span>
                          <span className="font-bold text-white text-sm mt-0.5">{opponent ? opponent.name : 'TBD / Bye'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${m.match_status === 'Ongoing' ? 'bg-accent animate-ping' : 'bg-secondary'}`} />
                          <span className="text-xs uppercase font-bold text-textMuted">{m.match_status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Completed Match History */}
            <div className="space-y-3 mt-6">
              <p className="text-xs text-textMuted uppercase font-bold tracking-widest mb-2">Combat Log Archives ({completedMatches.length})</p>
              {completedMatches.length === 0 ? (
                <div className="p-6 text-center text-textMuted glass-panel rounded-xl text-sm border border-white/5">
                  No historical campaign logs found.
                </div>
              ) : (
                completedMatches.map(m => {
                  const t = tournamentsMap[m.tournament_id];
                  const opponent = m.player1_id === profile.id ? m.player2 : m.player1;
                  const myScore = m.player1_id === profile.id ? m.player1_score : m.player2_score;
                  const opScore = m.player1_id === profile.id ? m.player2_score : m.player1_score;
                  const isWinner = m.winner_id === profile.id;
                  
                  return (
                    <div key={m.id} className="glass-panel p-4 rounded-xl border border-white/5 bg-surface/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-textMuted leading-tight">{t?.name || 'Campaign'}</p>
                        <p className="text-white font-bold text-sm mt-1">vs {opponent ? opponent.name : 'AI / Bye'}</p>
                        <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mt-1">Round {m.round}</p>
                      </div>
                      
                      <div className="text-right">
                        {m.disputed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <AlertTriangle size={10} className="inline mr-1 mb-0.5" />
                            Disputed
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isWinner ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {isWinner ? 'Victory' : 'Defeat'}
                          </span>
                        )}
                        <p className="text-lg font-bold text-white mt-1.5">{myScore} - {opScore}</p>
                        {!m.disputed && (
                          <button 
                            onClick={() => { setSelectedMatch(m); setDisputeModalOpen(true); }}
                            className="text-[10px] text-textMuted hover:text-white mt-1 underline decoration-white/30"
                          >
                            Dispute Match
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Cyber sliding Drawer alert Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-surface/95 border-l border-white/10 z-50 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-background/50">
                <div className="flex items-center gap-2.5">
                  <Bell size={20} className="text-primary animate-pulse" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Alert Center</h3>
                </div>
                <div className="flex items-center gap-4">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary font-bold uppercase hover:underline transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-textMuted hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Alerts body scroll container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-textMuted text-sm">
                    No active warnings or mission directives on file.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                      className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                        n.is_read 
                          ? 'bg-surface/20 border-white/5 text-textMuted' 
                          : 'bg-surface/60 border-primary/20 hover:border-primary/40 text-white cursor-pointer shadow-[0_0_10px_rgba(0,255,63,0.05)]'
                      }`}
                    >
                      {!n.is_read && (
                        <div className="absolute top-0 right-0 h-3 w-3 bg-primary rounded-bl" />
                      )}
                      
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h5 className={`font-bold text-sm ${n.is_read ? 'text-white/60' : 'text-white'}`}>{n.title}</h5>
                        <span className="text-[10px] text-textMuted whitespace-nowrap">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-textMuted leading-relaxed mt-1.5">{n.message}</p>
                      
                      {!n.is_read && (
                        <div className="flex justify-end mt-3 border-t border-white/5 pt-2">
                          <span className="text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                            <Check size={10} /> Mark Read
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dispute Modal */}
      <AnimatePresence>
        {disputeModalOpen && selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDisputeModalOpen(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <AlertTriangle className="text-yellow-400" />
                Dispute Match Results
              </h3>
              
              <form onSubmit={submitDispute}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">Reason for Dispute</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full bg-background border border-white/10 rounded-lg p-3 text-white focus:border-yellow-400/50 outline-none transition-colors resize-none"
                      placeholder="e.g. Opponent used unauthorized software, score mismatch, etc."
                      value={disputeReason}
                      onChange={e => setDisputeReason(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setDisputeModalOpen(false)} className="px-4 py-2 rounded border border-white/10 text-white hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors">
                    Submit Dispute
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
