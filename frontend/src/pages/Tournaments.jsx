import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Swords, CheckCircle, Crosshair, Search, SlidersHorizontal, X, Calendar, FileText, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [recommendedTournaments, setRecommendedTournaments] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]); // array of { tournament_id, status }
  const [myTeam, setMyTeam] = useState(null);
  const { user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);

  // Twitch Auto-Prompt State
  const [showTwitchPrompt, setShowTwitchPrompt] = useState(false);
  const [twitchUsername, setTwitchUsername] = useState('');
  const [pendingTournament, setPendingTournament] = useState(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('latest');
  
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [modalTab, setModalTab] = useState('details');
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTournament) {
      setModalTab('details');
      api.get(`/tournaments/${selectedTournament.id}/approved-players`)
        .then(res => setTournamentPlayers(res.data))
        .catch(err => console.error(err));
    } else {
      setTournamentPlayers([]);
    }
  }, [selectedTournament]);


  const fetchData = async () => {
    try {
      setLoading(true);
      const calls = [api.get('/tournaments')];
      if (user && user.role === 'player') {
          calls.push(api.get('/my-registrations'));
          calls.push(api.get('/recommendations/tournaments'));
      } else {
          calls.push(Promise.resolve({ data: [] })); // registrations
          calls.push(Promise.resolve({ data: [] })); // recommendations
      }
      
      const [tRes, myTRes, recRes] = await Promise.all(calls);
      setTournaments(tRes.data);
      setMyRegistrations(myTRes.data);
      setRecommendedTournaments(recRes.data);
      
      if (user && user.role === 'player') {
          try {
              const teamRes = await api.get('/lobby/my-team');
              setMyTeam(teamRes.data);
          } catch(err) {
              setMyTeam(null);
          }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for tournament join success toast
    const query = new URLSearchParams(location.search);
    const success = query.get('join_success');
    
    if (success) {
        toast.success('Successfully registered for tournament!', { duration: 5000, icon: '🏆' });
        // remove param from url
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchData();

    // Real-time synchronization
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'REFRESH_TOURNAMENTS' || data.type === 'REFRESH_REGISTRATIONS') {
          fetchData();
        }
      } catch (err) {}
    };

    return () => socket.close();
  }, [user, location.search, navigate]);

  const handleRegister = async (t) => {
    if (user && !user.is_premium && user.role !== 'admin') {
      toast.error('Need Premium plan for joining tournaments!', { icon: '👑' });
      return;
    }
    
    // Auto-prompt for Twitch
    if (user && !user.twitch_username && user.role !== 'admin') {
      setPendingTournament(t);
      setShowTwitchPrompt(true);
      return;
    }

    await completeRegistration(t);
  };

  const submitTwitchAndRegister = async () => {
    if (!twitchUsername) return;
    try {
      await api.put('/profile/twitch', { twitch_username: twitchUsername });
      toast.success('Twitch linked successfully!');
      if (fetchUser) await fetchUser(); // Reload user context if available
      setShowTwitchPrompt(false);
      if (pendingTournament) {
        await completeRegistration(pendingTournament);
        setPendingTournament(null);
      }
    } catch (err) {
      toast.error('Failed to link Twitch');
    }
  };

  const completeRegistration = async (t) => {
    
    let payload = { tournament_id: t.id };
    
    if (t.match_type === 'Squad') {
        if (!myTeam) {
            toast.error('You must be in a Squad to register for squad tournaments.', { icon: '🛡️' });
            return;
        }
        if (myTeam.captain_id !== user.id) {
            toast.error('Only the team captain can register the squad for a tournament.', { icon: '👑' });
            return;
        }
        payload.team_id = myTeam.id;
    }
    
    try {
      const res = await api.post('/register-tournament', payload);
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setMyRegistrations([...myRegistrations, { tournament_id: t.id, status: 'Approved' }]);
        toast.success('Successfully registered! Fee deducted from wallet.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    }
  };

  // Filter and Sort Tournaments
  const filteredTournaments = tournaments
    .filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.game.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' ? true : t.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'prize_desc') return b.prize_pool - a.prize_pool;
      if (sortBy === 'prize_asc') return a.prize_pool - b.prize_pool;
      if (sortBy === 'max_players') return b.max_players - a.max_players;
      return b.id - a.id; // Default: Latest
    });

  if (loading) {
    return <div className="text-center p-12 text-secondary">Loading intel...</div>;
  }

  const statusOptions = ['All', 'Upcoming', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed'];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Twitch Auto-Prompt Modal */}
      <AnimatePresence>
        {showTwitchPrompt && (
          <motion.div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-6 rounded-xl border border-primary/30 max-w-md w-full shadow-[0_0_50px_rgba(157,78,221,0.2)]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Video className="text-primary" /> Setup Your Stream
                </h3>
                <button onClick={() => { setShowTwitchPrompt(false); setPendingTournament(null); }} className="text-textMuted hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <p className="text-secondary mb-4">Before entering the arena, link your Twitch username to broadcast your plays to Esports TV!</p>
              <input 
                type="text"
                placeholder="Twitch Username"
                className="w-full bg-background border border-white/10 rounded px-4 py-2 text-white mb-4 focus:border-primary outline-none"
                value={twitchUsername}
                onChange={(e) => setTwitchUsername(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowTwitchPrompt(false); completeRegistration(pendingTournament); setPendingTournament(null); }} className="px-4 py-2 rounded text-textMuted hover:text-white">Skip for now</button>
                <button onClick={submitTwitchAndRegister} className="px-4 py-2 bg-primary text-white rounded font-bold hover:bg-primary/90 transition shadow-[0_0_15px_rgba(157,78,221,0.5)]">Link & Register</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-3">
            <Crosshair className="text-primary animate-pulse" size={32} />
            <span className="glitch" data-text="Active Scrims & Tournaments">Active Scrims & Tournaments</span>
          </h1>
          <p className="text-textMuted">Browse and join the available battlegrounds.</p>
        </div>
      </div>

      {/* AI Recommendations Carousel */}
      {recommendedTournaments.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-display font-bold text-white uppercase mb-4 flex items-center gap-2">
            <Sparkles className="text-yellow-400 animate-pulse" /> AI Recommended For You
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
            {recommendedTournaments.map(t => {
              const regData = myRegistrations.find(r => r.tournament_id === t.id);
              const isRegistered = !!regData;
              const regStatus = regData ? regData.status : null;
              return (
                <div key={`rec-${t.id}`} className="snap-start shrink-0 w-80">
                  <TournamentCard 
                    t={t} 
                    user={user}
                    isRegistered={isRegistered}
                    regStatus={regStatus}
                    handleRegister={handleRegister}
                    setSelectedTournament={setSelectedTournament}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Filter and Search Bar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-white/5 bg-surface/40">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
            <input 
              type="text" 
              placeholder="Search by tournament name or game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface/50 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-textMuted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <SlidersHorizontal className="text-textMuted" size={18} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-all duration-300 cursor-pointer appearance-none"
            >
              <option value="latest" className="bg-surface">Latest Created</option>
              <option value="prize_desc" className="bg-surface">Prize: High to Low</option>
              <option value="prize_asc" className="bg-surface">Prize: Low to High</option>
              <option value="max_players" className="bg-surface">Max Participants</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
          {statusOptions.map(option => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                statusFilter === option 
                  ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_rgba(0,255,63,0.2)]'
                  : 'bg-surface/50 text-textMuted border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Grid rendering */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredTournaments.map((t, i) => {
            const regData = myRegistrations.find(r => r.tournament_id === t.id);
            const isRegistered = !!regData;
            const regStatus = regData ? regData.status : null;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                key={t.id} 
              >
                <TournamentCard 
                  t={t} 
                  user={user}
                  isRegistered={isRegistered}
                  regStatus={regStatus}
                  handleRegister={handleRegister}
                  setSelectedTournament={setSelectedTournament}
                />
              </motion.div>
            );


          })}
        </AnimatePresence>
        {filteredTournaments.length === 0 && (
          <div className="col-span-full py-12 text-center text-textMuted glass-panel rounded-xl">
            No tournaments found matching the filters.
          </div>
        )}
      </div>

      {/* Tournament Details Modal */}
      <AnimatePresence>
        {selectedTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedTournament(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass-panel w-full max-w-3xl rounded-2xl overflow-hidden border border-white/10 bg-surface flex flex-col max-h-[90vh]"
            >
              {/* Modal Header / Banner */}
              <div className="h-48 relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent z-10"></div>
                {selectedTournament.banner ? (
                  <img src={selectedTournament.banner} alt={selectedTournament.name} className="w-full h-full object-cover z-0" />
                ) : (
                  <div className={`absolute inset-0 opacity-20 ${selectedTournament.game.toLowerCase().includes('valorant') ? 'bg-red-500' : selectedTournament.game.toLowerCase().includes('bgmi') ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                )}
                <button 
                  onClick={() => setSelectedTournament(null)}
                  className="absolute top-4 right-4 z-20 p-2 bg-background/50 hover:bg-primary/20 hover:text-primary rounded-full text-white backdrop-blur-md transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-6 z-20">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-surface/50 border border-white/20 backdrop-blur-md mb-2 inline-block text-white">
                    {selectedTournament.game}
                  </span>
                  <h2 className="text-3xl font-display font-bold text-white shadow-sm">{selectedTournament.name}</h2>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-background/50 rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Prize Pool</p>
                    <p className="text-xl font-bold text-primary">₹{selectedTournament.prize_pool}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Entry Fee</p>
                    <p className="text-xl font-bold text-white">₹{selectedTournament.entry_fee || (selectedTournament.prize_pool * 0.1)}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">
                      {selectedTournament.match_type === 'Squad' ? 'Max Squads' : 'Max Players'}
                    </p>
                    <p className="text-xl font-bold text-white">{selectedTournament.max_players}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-4 border border-white/5 text-center">
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Status</p>
                    <p className={`text-sm font-bold mt-1.5 uppercase ${selectedTournament.status === 'Ongoing' ? 'text-accent' : selectedTournament.status === 'Completed' ? 'text-red-400' : 'text-primary'}`}>{selectedTournament.status}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 mb-6">
                  <button
                    onClick={() => setModalTab('details')}
                    className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                      modalTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-white'
                    }`}
                  >
                    Details & Rules
                  </button>
                  <button
                    onClick={() => setModalTab('registrations')}
                    className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                      modalTab === 'registrations' ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-white'
                    }`}
                  >
                    Registrations <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px]">{selectedTournament.approved_count || tournamentPlayers.length} / {selectedTournament.max_players}</span>
                  </button>
                </div>

                {modalTab === 'details' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Calendar size={16} /> Schedule
                      </h4>
                      <div className="space-y-3 bg-surface/50 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">Reg. Opens</span>
                          <span className="font-semibold text-white">{selectedTournament.reg_start ? new Date(selectedTournament.reg_start).toLocaleString() : 'TBA'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">Reg. Closes</span>
                          <span className="font-semibold text-white">{selectedTournament.reg_end ? new Date(selectedTournament.reg_end).toLocaleString() : 'TBA'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3 mt-3">
                          <span className="text-textMuted">Match Day</span>
                          <span className="font-bold text-primary">{selectedTournament.match_day ? new Date(selectedTournament.match_day).toLocaleString() : 'TBA'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Swords size={16} /> Match Configuration
                      </h4>
                      <div className="bg-surface/50 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">Format</span>
                          <span className="font-semibold text-white">{selectedTournament.match_type} Matchup</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText size={16} /> Rules & Regulations
                    </h4>
                    <div className="bg-surface/50 rounded-xl p-4 border border-white/5 h-full text-sm text-textMuted whitespace-pre-wrap leading-relaxed">
                      {selectedTournament.rules || 'No specific rules provided for this tournament. Standard platform rules apply.'}
                    </div>
                  </div>
                </div>
                ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={16} /> Approved Players
                  </h4>
                  {tournamentPlayers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tournamentPlayers.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-surface/50 border border-white/5 rounded-xl">
                          <div className="h-10 w-10 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold font-display uppercase">
                            {p.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{p.name}</p>
                            <p className="text-xs text-textMuted">{p.ranking_points} RP • {p.tier}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-surface/30 rounded-xl border border-dashed border-white/10 text-textMuted">
                      No operatives have secured a slot yet. Be the first!
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Modal Footer */}
              {user && user.role === 'player' && (() => {
                const modalRegData = myRegistrations.find(r => r.tournament_id === selectedTournament.id);
                const modalIsReg = !!modalRegData;
                const modalStatus = modalRegData ? modalRegData.status : null;
                const isFull = selectedTournament.approved_count >= selectedTournament.max_players;
                
                return (
                  <div className="p-6 border-t border-white/10 bg-background/50 flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegister(selectedTournament);
                      }}
                      disabled={(modalIsReg && modalStatus !== 'Pending Payment') || (selectedTournament.status !== 'Upcoming' && selectedTournament.status !== 'Registration Open') || (!modalIsReg && isFull)}
                      className={`py-3 px-8 rounded-lg font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        (modalIsReg && modalStatus !== 'Pending Payment')
                          ? (modalStatus === 'Approved' ? 'bg-green-500/20 text-green-500 border border-green-500/50 cursor-not-allowed' :
                             modalStatus === 'Rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/50 cursor-not-allowed' :
                             'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 cursor-not-allowed')
                          : (!modalIsReg && isFull)
                          ? 'bg-red-500/20 text-red-500 border border-red-500/50 cursor-not-allowed'
                          : (selectedTournament.status !== 'Upcoming' && selectedTournament.status !== 'Registration Open')
                          ? 'bg-surface/50 text-textMuted cursor-not-allowed border border-white/5'
                          : 'btn-primary shadow-[0_0_15px_rgba(0,255,63,0.3)] hover:shadow-[0_0_25px_rgba(0,255,63,0.5)]'
                      }`}
                    >
                      {(modalIsReg && modalStatus !== 'Pending Payment') ? (
                        modalStatus === 'Approved' ? <><CheckCircle size={18} /> Joined</> :
                        modalStatus === 'Rejected' ? <><X size={18} /> Rejected</> :
                        <><Clock size={18} /> Pending Approval</>
                      ) : (!modalIsReg && isFull) ? (
                        'Registration Full'
                      ) : (
                        'Join Tournament'
                      )}
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TournamentCard({ t, user, isRegistered, regStatus, handleRegister, setSelectedTournament }) {
  const isFull = t.approved_count >= t.max_players;
  return (
    <div onClick={() => setSelectedTournament(t)} className="cursor-pointer h-full">
      <Tilt 
        tiltMaxAngleX={10} 
        tiltMaxAngleY={10} 
        glareEnable={true} 
        glareMaxOpacity={0.3} 
        glareColor="#00f5ff" 
        glarePosition="all" 
        scale={1.02} 
        transitionSpeed={2000}
        className="glass-panel rounded-2xl overflow-hidden group tilt-card h-full"
      >
      <div className="h-40 bg-surface/80 relative flex items-center justify-center border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
        {t.banner ? (
          <img src={t.banner} alt={t.name} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <>
            <div className={`absolute inset-0 opacity-20 ${t.game.toLowerCase().includes('valorant') ? 'bg-red-500' : t.game.toLowerCase().includes('bgmi') ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
            <Swords size={64} className="text-white/10 group-hover:scale-110 transition-transform duration-700 z-0" />
          </>
        )}
        <div className="absolute top-3 right-3 z-20">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            t.status === 'Completed' 
              ? 'bg-red-500/20 text-red-400 border-red-500/50' 
              : t.status === 'Ongoing'
              ? 'bg-accent/20 text-accent border-accent/50 animate-pulse'
              : t.status === 'Registration Open'
              ? 'bg-primary/20 text-primary border-primary/50'
              : 'bg-secondary/20 text-secondary border-secondary/50'
          }`}>
            {t.status}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-1 leading-tight group-hover:text-primary transition-colors">{t.name}</h3>
          <p className="text-secondary font-semibold text-sm tracking-wider uppercase">{t.game}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface/50 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-textMuted uppercase mb-1 font-semibold">Prize Pool</p>
            <p className="text-primary font-bold text-lg">₹{t.prize_pool}</p>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-textMuted uppercase mb-1 font-semibold">
              {t.match_type === 'Squad' ? 'Max Squads' : 'Max Players'}
            </p>
            <p className="text-white font-bold text-lg">{t.max_players}</p>
          </div>
        </div>

        {user && user.role === 'player' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRegister(t);
            }}
            disabled={(isRegistered && regStatus !== 'Pending Payment') || (t.status !== 'Upcoming' && t.status !== 'Registration Open') || (!isRegistered && isFull)}
            className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              (isRegistered && regStatus !== 'Pending Payment') 
                ? (regStatus === 'Approved' ? 'bg-green-500/20 text-green-500 border border-green-500/50 cursor-not-allowed' :
                   regStatus === 'Rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/50 cursor-not-allowed' :
                   'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 cursor-not-allowed')
                : (!isRegistered && isFull) 
                ? 'bg-red-500/20 text-red-500 border border-red-500/50 cursor-not-allowed'
                : (t.status !== 'Upcoming' && t.status !== 'Registration Open')
                ? 'bg-surface/50 text-textMuted cursor-not-allowed border border-white/5'
                : 'btn-primary'
            }`}
          >
            {(isRegistered && regStatus !== 'Pending Payment') ? (
              regStatus === 'Approved' ? <><CheckCircle size={18} /> Joined</> :
              regStatus === 'Rejected' ? <><X size={18} /> Rejected</> :
              <><Clock size={18} /> Pending Approval</>
            ) : (!isRegistered && isFull) ? (
              'Registration Full'
            ) : (
              'Join Tournament'
            )}
          </button>
        )}
        </div>
      </Tilt>
    </div>
  );
}
