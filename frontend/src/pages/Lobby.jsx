import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Send, Key, Target, Search, Plus, UserPlus, Check, X, Shield, Lock, Mic } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceChannel from '../components/VoiceChannel';

export default function Lobby() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('squad-finder');
  
  // Squad Finder State
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Room Details State
  const [roomDetails, setRoomDetails] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

  // Admin Squads State
  const [adminSquads, setAdminSquads] = useState([]);
  const fetchAdminSquads = async () => {
    try {
      const res = await api.get('/lobby/admin/teams');
      setAdminSquads(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Voice State
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);

  useEffect(() => {
    fetchTeams();
    if (user) {
      if (user.role === 'admin') {
        setActiveTab('admin-squads');
        fetchAdminSquads();
      } else {
        fetchMyTeam();
      }
    }
  }, [user]);

  useEffect(() => {
    // Connect to WebSocket for real-time chat
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/ws`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOBBY_CHAT') {
          setMessages(prev => [...prev, data]);
        }
      } catch (err) {}
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/lobby/teams');
      setTeams(res.data);
    } catch (err) {
      toast.error('Failed to load squads');
    }
  };

  const fetchMyTeam = async () => {
    try {
      const res = await api.get('/lobby/my-team');
      setMyTeam(res.data);
      if (res.data.captain_id === user.id) {
        fetchJoinRequests();
      }
      // Assuming tournament matches are linked, fetch room credentials for active match
      fetchRoomCredentials(1); // Hardcoded match_id for demo, would come from active tournament list
    } catch (err) {
      // User is not in a team
      setMyTeam(null);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const res = await api.get('/lobby/my-team/requests');
      setJoinRequests(res.data);
    } catch (err) {}
  };

  const fetchRoomCredentials = async (matchId) => {
    setLoadingRoom(true);
    try {
      const res = await api.get(`/battleroyale/matches/${matchId}/room`);
      setRoomDetails(res.data);
    } catch (err) {
      setRoomDetails(null);
    } finally {
      setLoadingRoom(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName) return;
    try {
      await api.post('/lobby/teams', { name: newTeamName, is_recruiting: true, max_members: 4 });
      toast.success('Squad created successfully!');
      setShowCreateModal(false);
      fetchMyTeam();
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create squad');
    }
  };

  const handleRequestJoin = async (teamId) => {
    try {
      await api.post(`/lobby/teams/${teamId}/request-join`);
      toast.success('Join request sent to captain!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      await api.post(`/lobby/requests/${reqId}/accept`);
      toast.success('Player recruited!');
      fetchJoinRequests();
      fetchMyTeam();
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      await api.post(`/lobby/requests/${reqId}/reject`);
      toast.success('Request rejected.');
      fetchJoinRequests();
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const msg = {
      type: 'LOBBY_CHAT',
      user_id: user.id,
      name: user.name,
      role: user.role,
      message: newMessage,
      timestamp: new Date().toISOString()
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      setNewMessage('');
    } else {
      toast.error('Chat connection lost. Please refresh.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 border-b border-cyan-500/30 pb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-widest drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            ULTRA LOBBY
          </h1>
          <p className="text-cyan-400/70 font-bold uppercase tracking-widest text-sm mt-1">
            Global Hub • Custom Rooms • Squad Recruitment
          </p>
        </div>
        <div className="flex gap-2 bg-[#0a0a0f]/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
          {(user?.role === 'admin' ? ['admin-squads', 'room-details'] : ['squad-finder', 'my-squad', 'room-details']).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          <AnimatePresence mode="wait">
            {/* SQUAD FINDER TAB */}
            {activeTab === 'squad-finder' && (
              <motion.div key="finder" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center bg-[#0a0a0f]/80 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Search className="text-cyan-400" /> Recruiting Squads
                  </h2>
                  {!myTeam && user && (
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                      <Plus size={16} /> Create Squad
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-gray-500 glass-panel rounded-xl">
                      No squads are currently recruiting. Create one!
                    </div>
                  ) : (
                    teams.map(team => (
                      <div key={team.id} className="glass-panel p-5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider group-hover:text-cyan-300 transition-colors">{team.name}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                              Members: {team.members?.length || 1} / {team.max_members}
                            </p>
                          </div>
                          <Shield className="text-cyan-500/50 h-8 w-8" />
                        </div>
                        {user ? (
                          !myTeam ? (
                            <button onClick={() => handleRequestJoin(team.id)} className="w-full py-2 bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 rounded-lg text-xs font-bold uppercase tracking-wider border border-white/10 hover:border-cyan-500/50 transition-all flex justify-center items-center gap-2">
                              <UserPlus size={14} /> Request to Join
                            </button>
                          ) : (
                            <button disabled className="w-full py-2 bg-white/5 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-white/5 cursor-not-allowed">
                              Already in a Squad
                            </button>
                          )
                        ) : (
                          <button disabled className="w-full py-2 bg-white/5 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-white/5 cursor-not-allowed">
                            Login to Join
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* MY SQUAD TAB */}
            {activeTab === 'my-squad' && (
              <motion.div key="squad" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {!myTeam ? (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 flex flex-col items-center justify-center">
                    <Users size={64} className="text-gray-600 mb-6" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">No Squad Assigned</h2>
                    <p className="text-gray-400 max-w-md mb-8">You need to join or create a squad to access Battle Royale custom rooms and team features.</p>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all border border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                      <Plus size={18} /> Create Squad
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden">
                      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"></div>
                      
                      <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                          <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{myTeam.name}</h2>
                          <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs mt-1">Command Center</p>
                        </div>
                        <div className="bg-cyan-500/20 border border-cyan-500/50 px-4 py-2 rounded-xl text-center">
                          <span className="block text-[10px] text-cyan-300 uppercase font-black tracking-widest mb-1">Capacity</span>
                          <span className="text-xl font-black text-white">{myTeam.members?.length || 1} <span className="text-cyan-500">/</span> {myTeam.max_members}</span>
                        </div>
                      </div>
                      
                      <div className="mb-6 relative z-10">
                        <button 
                          onClick={() => setActiveVoiceChannel(`Team_${myTeam.id}`)}
                          className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <Mic size={14} /> Connect Squad Voice
                        </button>
                      </div>

                      <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Active Roster</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {myTeam.members?.map(m => (
                            <div key={m.id} className="bg-black/50 border border-white/5 p-3 rounded-lg flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center font-bold text-cyan-400">
                                {m.user?.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{m.user?.name}</p>
                                {myTeam.captain_id === m.user_id ? (
                                  <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider border border-yellow-500/30">Captain</span>
                                ) : (
                                  <span className="text-[9px] bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider border border-cyan-500/20">Operative</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {myTeam.captain_id === user?.id && joinRequests.length > 0 && (
                      <div className="glass-panel p-6 rounded-2xl border border-yellow-500/30">
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest border-b border-yellow-500/20 pb-2 mb-4">Pending Join Requests ({joinRequests.length})</h3>
                        <div className="space-y-3">
                          {joinRequests.map(req => (
                            <div key={req.id} className="flex justify-between items-center bg-black/50 border border-white/5 p-3 rounded-lg">
                              <span className="font-bold text-white">{req.user?.name}</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleAcceptRequest(req.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40 transition-colors">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => handleRejectRequest(req.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition-colors">
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ADMIN SQUADS TAB */}
            {activeTab === 'admin-squads' && user?.role === 'admin' && (
              <motion.div key="admin-squads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20">
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                    <Shield size={24} className="text-primary" /> Global Squad Registry
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {adminSquads.map(squad => (
                      <div key={squad.id} className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                        <div className="bg-surface/50 p-4 border-b border-white/5 flex justify-between items-center">
                          <div>
                            <h4 className="font-display font-black text-lg text-white tracking-widest uppercase">{squad.name}</h4>
                            <p className="text-[10px] text-textMuted uppercase mt-1">
                              {squad.is_recruiting ? 'Actively Recruiting' : 'Closed Roster'}
                            </p>
                          </div>
                          <span className="bg-primary/20 text-primary border border-primary/40 px-2 py-1 rounded text-xs font-bold font-mono">
                            {squad.members ? squad.members.length : 0} / {squad.max_members}
                          </span>
                        </div>
                        <div className="p-4">
                          <h5 className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-2">Roster</h5>
                          {(!squad.members || squad.members.length === 0) ? (
                            <p className="text-xs text-textMuted italic">No operatives.</p>
                          ) : (
                            <ul className="space-y-1">
                              {squad.members.map(member => (
                                <li key={member.id} className="flex items-center justify-between bg-white/5 p-1.5 rounded text-sm">
                                  <span className="font-bold text-white text-xs">{member.user?.name}</span>
                                  {squad.captain_id === member.user?.id && (
                                    <span className="text-[8px] uppercase font-black tracking-wider text-accent bg-accent/10 px-1 py-0.5 rounded border border-accent/20">Captain</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                    {adminSquads.length === 0 && (
                      <div className="col-span-full text-center p-8 border border-white/5 rounded-xl">
                        <Users size={32} className="mx-auto text-textMuted mb-2 opacity-50" />
                        <p className="text-textMuted font-medium text-sm uppercase">No squads established.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ROOM DETAILS TAB */}
            {activeTab === 'room-details' && (
              <motion.div key="room" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {!myTeam ? (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-white/10">
                    <Lock size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest">You must be in a squad to view Custom Room details.</p>
                  </div>
                ) : loadingRoom ? (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 animate-pulse">
                    <p className="text-cyan-400 font-bold uppercase tracking-widest">Decrypting Room Credentials...</p>
                  </div>
                ) : roomDetails ? (
                  <div className="glass-panel p-8 rounded-2xl border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                    <Target className="text-red-500 mx-auto mb-6 h-16 w-16 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8">Deployment Credentials</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
                      <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                        <span className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Room ID</span>
                        <span className="text-2xl font-mono text-cyan-400 font-bold tracking-wider">{roomDetails.room_id}</span>
                      </div>
                      <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                        <span className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Password</span>
                        <span className="text-2xl font-mono text-red-400 font-bold tracking-wider">{roomDetails.room_password}</span>
                      </div>
                    </div>
                    
                    <p className="mt-8 text-xs text-gray-500 uppercase tracking-widest font-bold">Do not share these credentials outside your squad.</p>
                  </div>
                ) : (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-white/10">
                    <Target size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest">No active deployment found for your squad.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Global Lobby Chat */}
        <div className="lg:col-span-1 h-[600px] flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="bg-black/50 p-4 border-b border-white/5 flex items-center justify-between relative">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-500"></div>
            <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Lobby Comm-Link
            </h3>
            {user && (
              <button 
                onClick={() => setActiveVoiceChannel('Global_Lobby')}
                className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 p-1.5 rounded-lg transition-colors border border-cyan-500/30"
                title="Connect Global Voice"
              >
                <Mic size={14} />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest text-center px-4">
                Global communication channel initialized.
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] text-gray-500 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`text-[11px] font-black tracking-widest uppercase ${msg.role === 'admin' ? 'text-red-500' : 'text-cyan-400'}`}>
                      {msg.name}
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] break-words ${
                    msg.user_id === user?.id 
                      ? 'bg-cyan-500/20 text-cyan-50 border border-cyan-500/30' 
                      : 'bg-white/5 text-gray-300 border border-white/10'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-black/50 border-t border-white/5">
            {user ? (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Transmit message..."
                  className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600 font-medium"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 text-black p-2.5 rounded-xl transition-all flex items-center justify-center drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] disabled:drop-shadow-none"
                >
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <div className="text-center p-2 text-xs text-gray-500 font-bold uppercase tracking-widest border border-white/5 rounded-xl bg-black/50">
                Log in to transmit
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Create Squad Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0a0a0f] border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)] max-w-sm w-full">
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-6">Initialize Squad</h3>
              <form onSubmit={handleCreateTeam}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Designation (Squad Name)</label>
                    <input
                      type="text"
                      required
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold tracking-wide"
                      placeholder="e.g. Cyber Ninjas"
                    />
                  </div>
                  <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] mt-4">
                    Deploy
                  </button>
                </div>
              </form>
              <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeVoiceChannel && (
        <VoiceChannel 
          channelName={activeVoiceChannel} 
          onClose={() => setActiveVoiceChannel(null)} 
        />
      )}

    </div>
  );
}
