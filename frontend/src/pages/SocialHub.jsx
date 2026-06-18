import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PageHeader from '../components/layout/PageHeader';
import NeonCard from '../components/ui/NeonCard';
import { Send, Users, MessageSquare, Sparkles, UserPlus, Check, X, Mic, MicOff, Headphones, VolumeX, Radio, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import Tilt from 'react-parallax-tilt';

export default function SocialHub() {
  const { user } = useAuth();
  const { broadcast, subscribe } = useSocket();
  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'friends'
  
  // Global Chat State
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ultra_global_chat');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  
  // Clan State
  const [clans, setClans] = useState([]);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [showClanModal, setShowClanModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [clanToBan, setClanToBan] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [clanMembers, setClanMembers] = useState([]);
  const [viewingClanName, setViewingClanName] = useState('');
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [clanRequests, setClanRequests] = useState([]);
  const [viewingRequestsClanId, setViewingRequestsClanId] = useState(null);
  const [clanSearch, setClanSearch] = useState('');

  // Friends & DM State
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [dmMessages, setDmMessages] = useState({});
  const [dmInput, setDmInput] = useState('');
  const [typingStatus, setTypingStatus] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [addFriendId, setAddFriendId] = useState('');
  const [adminFriendships, setAdminFriendships] = useState([]);
  
  const endRef = useRef(null);
  const dmEndRef = useRef(null);
  const typingTimeoutRef = useRef({});

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const clansRes = await api.get('/clans');
        setClans(clansRes.data);
        if (user) {
          if (user.role === 'admin') {
            const adminRes = await api.get('/social/admin/friendships');
            setAdminFriendships(adminRes.data);
          } else {
            const [friendsRes, reqsRes] = await Promise.all([
              api.get('/social/friends'),
              api.get('/social/friends/requests')
            ]);
            setFriends(friendsRes.data);
            setRequests(reqsRes.data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch social data', e);
      }
    };
    fetchData();
  }, [user]);

  // Fetch DMs when a friend is selected
  useEffect(() => {
    if (selectedFriend && user && !dmMessages[selectedFriend.id]) {
      api.get(`/social/messages/${selectedFriend.id}`).then(res => {
        setDmMessages(prev => ({ ...prev, [selectedFriend.id]: res.data }));
      }).catch(err => console.error(err));
    }
  }, [selectedFriend, user]);

  useEffect(() => {
    sessionStorage.setItem('ultra_global_chat', JSON.stringify(messages.slice(-100)));
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages, selectedFriend, typingStatus]);

  useEffect(() => {
    // Request current online status immediately in case we missed the initial connection broadcast
    broadcast({ type: "GET_STATUS" });

    return subscribe((data) => {
      if (data.type === 'CHAT' || data.type === 'SUPER_CHAT') {
        setMessages((prev) => [...prev.slice(-99), data]);
      } else if (data.type === 'INITIAL_STATUS') {
        setOnlineUsers(new Set(data.online_users.map(Number)));
      } else if (data.type === 'STATUS') {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          if (data.status === 'online') next.add(Number(data.user_id));
          else next.delete(Number(data.user_id));
          return next;
        });
      } else if (data.type === 'DIRECT_MESSAGE') {
        const peerId = data.sender_id === user?.id ? data.receiver_id : data.sender_id;
        setDmMessages(prev => ({
          ...prev,
          [peerId]: [...(prev[peerId] || []), data]
        }));
        if (data.sender_id !== user?.id && (!selectedFriend || selectedFriend.id !== data.sender_id)) {
          toast(`New message received`, { icon: '💬' });
        }
      } else if (data.type === 'TYPING_START') {
        setTypingStatus(prev => ({...prev, [data.sender_id]: true}));
      } else if (data.type === 'TYPING_STOP') {
        setTypingStatus(prev => ({...prev, [data.sender_id]: false}));
      }
    });
  }, [subscribe, user, selectedFriend]);

  // Global Chat Send
  const send = (e) => {
    e.preventDefault();
    if (!user) return toast.error('Login required to chat');
    if (!input.trim()) return;
    const msg = {
      type: 'CHAT',
      user: user.name,
      user_id: user.id,
      avatar: user.avatar,
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    broadcast(msg);
    setMessages((prev) => [...prev, msg]);
    setInput('');
  };

  // Direct Message Send
  const sendDM = (e) => {
    e.preventDefault();
    if (!selectedFriend || !dmInput.trim()) return;
    broadcast({
      type: 'DIRECT_MESSAGE',
      receiver_id: selectedFriend.id,
      message: dmInput.trim()
    });
    setDmInput('');
    broadcast({ type: 'TYPING_STOP', receiver_id: selectedFriend.id });
  };

  const handleTyping = (e) => {
    setDmInput(e.target.value);
    if (selectedFriend) {
      broadcast({ type: 'TYPING_START', receiver_id: selectedFriend.id });
      clearTimeout(typingTimeoutRef.current[selectedFriend.id]);
      typingTimeoutRef.current[selectedFriend.id] = setTimeout(() => {
        broadcast({ type: 'TYPING_STOP', receiver_id: selectedFriend.id });
      }, 2000);
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/social/friends/request?friend_id=${addFriendId}`);
      toast.success("Friend request sent!");
      setAddFriendId('');
    } catch(err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg : (typeof detail === 'string' ? detail : "Failed to send request"));
    }
  };

  const handleRequestAction = async (reqId, action) => {
    try {
      await api.post(`/social/friends/requests/${reqId}/${action}`);
      toast.success(`Request ${action}ed`);
      const reqsRes = await api.get('/social/friends/requests');
      setRequests(reqsRes.data);
      if (action === 'accept') {
        const friendsRes = await api.get('/social/friends');
        setFriends(friendsRes.data);
      }
    } catch(err) {
      toast.error("Action failed");
    }
  };

  // Clan Handlers
  const handleCreateClan = async (e) => {
    e.preventDefault();
    if (!newClanName.trim() || !newClanTag.trim()) return;
    try {
      await api.post('/clans', { name: newClanName.trim(), tag: newClanTag.trim() });
      toast.success('Clan Created!');
      setNewClanName('');
      setNewClanTag('');
      setShowClanModal(false);
      api.get('/clans').then(res => setClans(res.data));
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg : (typeof detail === 'string' ? detail : 'Failed to create clan'));
    }
  };

  const handleBanClan = async (e) => {
    e.preventDefault();
    if (!banReason.trim() || !clanToBan) return;
    try {
      await api.post(`/clans/${clanToBan.id}/ban`, { reason: banReason.trim() });
      toast.success('Squad Banned!');
      setShowBanModal(false);
      setBanReason('');
      setClanToBan(null);
      api.get('/clans').then(res => setClans(res.data));
    } catch (err) {
      toast.error('Failed to ban squad');
    }
  };

  const handleViewMembers = async (clan) => {
    try {
      const res = await api.get(`/clans/${clan.id}/members`);
      setClanMembers(res.data);
      setViewingClanName(clan.name);
      setShowMembersModal(true);
    } catch (err) {
      toast.error('Failed to fetch members');
    }
  };

  const handleViewRequests = async (clan) => {
    try {
      const res = await api.get(`/clans/${clan.id}/requests`);
      setClanRequests(res.data);
      setViewingClanName(clan.name);
      setViewingRequestsClanId(clan.id);
      setShowRequestsModal(true);
    } catch (err) {
      toast.error('Failed to fetch requests');
    }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      await api.post(`/clans/requests/${reqId}/accept`);
      setClanRequests(prev => prev.filter(r => r.id !== reqId));
      toast.success('Request accepted');
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      await api.post(`/clans/requests/${reqId}/reject`);
      setClanRequests(prev => prev.filter(r => r.id !== reqId));
      toast.success('Request rejected');
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const handleJoinClan = async (clanId) => {
    try {
      await api.post(`/clans/${clanId}/join`);
      toast.success('Joined clan!');
      api.get('/clans').then(res => setClans(res.data));
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg : (typeof detail === 'string' ? detail : 'Failed to join clan'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 relative z-10">
      <PageHeader
        badge="Social Gaming"
        title="Comms Center"
        subtitle="Global chat, direct messaging, and squad management."
      />

      <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
        <button 
          onClick={() => setActiveTab('global')}
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'global' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
        >
          Global Chat
        </button>
        <button 
          onClick={() => setActiveTab('friends')}
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'friends' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
        >
          Friends & DMs
        </button>
        <button 
          onClick={() => setActiveTab('clans')}
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'clans' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-white'}`}
        >
          Clans
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {activeTab === 'global' && (
          <div className="lg:col-span-2 lg:w-2/3 mx-auto w-full">
            <NeonCard accent="magenta" className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                  <span className="font-display font-bold text-white uppercase tracking-wider text-sm">
                    Global Channel
                  </span>
                  {!isChatDisabled && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase ml-2 animate-pulse flex items-center gap-1">
                      <Radio size={10} /> Voice Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                    className={`p-1.5 rounded-lg transition-colors ${isVoiceMuted || isChatDisabled ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-surface border border-white/10 text-white hover:border-white/30'}`}
                    title={isVoiceMuted ? "Unmute Mic" : "Mute Mic"}
                    disabled={isChatDisabled}
                  >
                    {isVoiceMuted || isChatDisabled ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button 
                    onClick={() => setIsChatDisabled(!isChatDisabled)}
                    className={`p-1.5 rounded-lg transition-colors ${isChatDisabled ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-surface border border-white/10 text-white hover:border-white/30'}`}
                    title={isChatDisabled ? "Enable Channel" : "Disable Channel"}
                  >
                    {isChatDisabled ? <VolumeX size={16} /> : <Headphones size={16} />}
                  </button>
                </div>
              </div>
              
              {isChatDisabled ? (
                <div className="flex-1 flex flex-col items-center justify-center text-textMuted text-sm">
                  <VolumeX className="w-12 h-12 mb-4 opacity-20" />
                  <p>Channel is currently disabled.</p>
                  <p className="text-xs mt-1">Click the headphones icon to reconnect to Voice & Chat.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                    <AnimatePresence initial={false}>
                      {messages.map((m, i) => (
                        <motion.div
                          key={`${m.timestamp}-${i}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex gap-3 p-3 rounded-xl ${
                            m.type === 'SUPER_CHAT' ? 'bg-neonGold/10 border border-neonGold/30' : 'bg-white/5 border border-white/5'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(m.user || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link to={`/player/${m.user_id || 1}`} className="font-bold text-white text-sm hover:text-primary transition-colors cursor-pointer">{m.user}</Link>
                              {m.type === 'SUPER_CHAT' && (
                                <span className="text-[9px] bg-neonGold/20 text-neonGold px-1.5 rounded font-black">₹{m.amount}</span>
                              )}
                            </div>
                            <p className="text-sm text-textMuted mt-0.5">{m.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={endRef} />
                  </div>
                  <form onSubmit={send} className="flex gap-2">
                    <input
                      className="input-field flex-1"
                      placeholder={user ? 'Transmit message...' : 'Login to chat'}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={!user}
                    />
                    <button type="submit" className="btn-primary px-4" disabled={!user}><Send className="w-5 h-5" /></button>
                  </form>
                </>
              )}
            </NeonCard>
          </div>
        )}

        {activeTab === 'clans' && (
          <div className="lg:col-span-2 lg:w-2/3 mx-auto w-full">
            <div className="space-y-4 max-h-[calc(100vh-220px)] min-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <NeonCard accent="cyan" className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm glitch" data-text="CLANS">CLANS</h3>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input 
                      type="text"
                      placeholder="Search clans..."
                      value={clanSearch}
                      onChange={(e) => setClanSearch(e.target.value)}
                      className="input-field py-1.5 px-3 text-xs w-full sm:w-48"
                    />
                    {user?.role !== 'admin' && (
                      <button 
                        onClick={() => { if(!user) return toast.error("Login required"); setShowClanModal(true); }} 
                        className="text-[10px] bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-3 py-1.5 rounded uppercase font-bold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        + Create
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {clans.filter(c => c.name.toLowerCase().includes(clanSearch.toLowerCase())).map(c => (
                    <Tilt key={c.id} tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={2000} className="tilt-card">
                      <div className={`bg-surface/50 p-3 rounded-xl border border-white/5 flex flex-col gap-2 ${c.is_banned ? 'opacity-70' : ''}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              {!c.is_banned ? (
                                <p onClick={() => handleViewMembers(c)} className={`font-bold text-sm uppercase text-white cursor-pointer hover:text-primary transition-colors hover:underline`}>{c.name}</p>
                              ) : (
                                <p className={`font-bold text-sm uppercase text-red-500 line-through`}>{c.name}</p>
                              )}
                              {c.is_banned && <span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-bold">BANNED</span>}
                            </div>
                            <p className="text-[10px] text-textMuted uppercase tracking-wider">{c.members?.length || 1} Members • XP: {c.total_xp}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-gradient-to-r from-neonGold/20 to-transparent border border-neonGold/30 px-2 py-1 rounded-full" title="Clan Popularity (Total XP)">
                              <Flame className="w-3 h-3 text-neonGold animate-pulse" />
                              <span className="text-neonGold font-black text-[10px] tracking-wider">{c.total_xp}</span>
                            </div>
                            {user?.role === 'admin' && !c.is_banned && (
                               <div className="flex gap-2">
                                 <button onClick={() => { setClanToBan(c); setShowBanModal(true); }} className="text-[10px] bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-500 px-2 py-1 rounded uppercase font-bold cursor-pointer">Ban Squad</button>
                               </div>
                            )}
                            {user?.role !== 'admin' && !c.is_banned && c.leader_id !== user?.id && (
                              <button onClick={() => handleJoinClan(c.id)} className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded uppercase font-bold cursor-pointer">Join</button>
                            )}
                            {user?.role !== 'admin' && !c.is_banned && c.leader_id === user?.id && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Owner</span>
                                <button onClick={() => handleViewRequests(c)} className="text-[10px] bg-secondary/20 hover:bg-secondary/40 border border-secondary/50 text-secondary px-2 py-1 rounded uppercase font-bold cursor-pointer">Requests</button>
                              </div>
                            )}
                          </div>
                        </div>
                        {c.is_banned && c.leader_id === user?.id && (
                          <div className="mt-1 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                            <span className="font-bold">Ban Reason:</span> {c.ban_reason}
                          </div>
                        )}
                      </div>
                    </Tilt>
                  ))}
                </div>
              </NeonCard>
            </div>
          </div>
        )}

        {activeTab === 'friends' && user?.role === 'admin' ? (
          <div className="lg:col-span-2 lg:w-3/4 mx-auto w-full">
            <NeonCard accent="cyan" className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <Users className="w-5 h-5 text-secondary" />
                <span className="font-display font-bold text-white uppercase tracking-wider text-sm">
                  Global Friendship Directory
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-surface border-b border-white/10 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 font-bold uppercase tracking-wider text-primary text-[10px]">User 1</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-primary text-[10px]">User 2</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-primary text-[10px]">Status</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-primary text-[10px]">Date Established</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminFriendships.map(f => (
                      <tr key={f.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-white">{f.user?.name || 'Unknown'}</td>
                        <td className="p-3 font-medium text-white">{f.friend?.name || 'Unknown'}</td>
                        <td className="p-3">
                          <span className="bg-secondary/20 text-secondary px-2 py-0.5 rounded text-xs">
                            {f.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-textMuted">
                          {new Date(f.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {adminFriendships.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center p-8 text-textMuted italic">
                          No established friendships found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </NeonCard>
          </div>
        ) : activeTab === 'friends' ? (
          <>
            <NeonCard accent="cyan" className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
              <div className="mb-4">
                <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-2 border-b border-white/10 pb-2">Add Friend</h3>
                <form onSubmit={handleAddFriend} className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Enter Player UID (e.g. 15)..."
                    value={addFriendId}
                    onChange={(e) => setAddFriendId(e.target.value)}
                  />
                  <button type="submit" className="bg-primary/20 hover:bg-primary text-primary hover:text-black rounded px-2 transition-colors"><UserPlus className="w-4 h-4"/></button>
                </form>
              </div>

              {requests.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-bold text-yellow-500 uppercase tracking-wider text-[10px] mb-2">Pending Requests</h3>
                  {requests.map(req => (
                    <div key={req.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-xs mb-1">
                      <span className="text-gray-300 font-bold truncate pr-2">Req From: {req.user?.name || 'Unknown'} <span className="font-mono text-[10px] text-gray-500">(UID: {req.user_id})</span></span>
                      <div className="flex gap-1">
                        <button onClick={() => handleRequestAction(req.id, 'accept')} className="text-green-400 hover:bg-green-400/20 p-1 rounded"><Check className="w-3 h-3"/></button>
                        <button onClick={() => handleRequestAction(req.id, 'reject')} className="text-red-400 hover:bg-red-400/20 p-1 rounded"><X className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-2">Your Friends</h3>
                {friends.length === 0 ? <p className="text-xs text-textMuted">No friends added yet.</p> : null}
                {friends.map(friend => {
                  const isOnline = true; // Forced online as requested
                  const isSelected = selectedFriend?.id === friend.id;
                  return (
                    <div 
                      key={friend.id} 
                      onClick={() => setSelectedFriend(friend)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 border border-primary/50' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                          {friend.avatar ? <img src={friend.avatar} alt="avatar" className="w-full h-full object-cover"/> : friend.name[0]}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-void ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isOnline ? 'text-white' : 'text-gray-400'}`}>{friend.name}</p>
                        {typingStatus[friend.id] && <p className="text-[9px] text-primary italic animate-pulse">Typing...</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </NeonCard>

            <NeonCard accent="magenta" className="lg:col-span-2 flex flex-col h-[calc(100vh-220px)] min-h-[400px] relative">
              {selectedFriend ? (
                <>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface border border-white/10 flex items-center justify-center font-bold text-white shrink-0">
                        {selectedFriend.avatar ? <img src={selectedFriend.avatar} alt="avatar" className="w-full h-full object-cover"/> : selectedFriend.name[0]}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-void bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">{selectedFriend.name}</h4>
                      <p className="text-xs text-green-400">Online</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 custom-scrollbar">
                    {(dmMessages[selectedFriend.id] || []).length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-textMuted text-center">Start a secure channel with {selectedFriend.name}.</p>
                      </div>
                    ) : (
                      (dmMessages[selectedFriend.id] || []).map((m, i) => {
                        const isMine = m.sender_id === user?.id;
                        return (
                          <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl ${isMine ? 'bg-primary text-black rounded-br-sm shadow-[0_0_10px_rgba(0,245,255,0.2)]' : 'bg-surface border border-white/10 text-white rounded-bl-sm'}`}>
                              <p className={`text-sm ${isMine ? 'font-medium' : ''}`}>{m.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {typingStatus[selectedFriend.id] && (
                      <div className="flex justify-start">
                        <div className="bg-surface border border-white/10 text-white p-3 rounded-2xl rounded-bl-sm text-xs italic text-gray-400 animate-pulse">
                          Typing...
                        </div>
                      </div>
                    )}
                    <div ref={dmEndRef} />
                  </div>

                  <form onSubmit={sendDM} className="flex gap-2">
                    <input
                      className="input-field flex-1"
                      placeholder={`Message ${selectedFriend.name}...`}
                      value={dmInput}
                      onChange={handleTyping}
                    />
                    <button type="submit" className="btn-primary px-4" disabled={!dmInput.trim()}><Send className="w-5 h-5" /></button>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                  <MessageSquare className="w-16 h-16 text-primary mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Select a Friend</h3>
                  <p className="text-sm text-textMuted mt-2">Open a secure direct messaging channel.</p>
                </div>
              )}
            </NeonCard>
          </>
        ) : null}
      </div>

      {/* Requests Modal */}
      <AnimatePresence>
        {showRequestsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-secondary/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="text-secondary" /> Pending Requests
                </h2>
                <button onClick={() => setShowRequestsModal(false)} className="text-textMuted hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {clanRequests.length === 0 ? (
                  <p className="text-textMuted text-sm text-center py-4">No pending requests.</p>
                ) : (
                  clanRequests.map(r => (
                    <div key={r.id} className="bg-black/40 p-3 rounded-lg border border-white/5 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-bold text-sm">{r.user?.name}</p>
                          <span className="text-[10px] text-textMuted">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptRequest(r.id)} className="flex-1 text-[10px] bg-green-500/20 hover:bg-green-500/40 text-green-500 border border-green-500/50 px-2 py-1.5 rounded uppercase font-bold cursor-pointer transition-colors">Accept</button>
                        <button onClick={() => handleRejectRequest(r.id)} className="flex-1 text-[10px] bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500/50 px-2 py-1.5 rounded uppercase font-bold cursor-pointer transition-colors">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Members Modal */}
      <AnimatePresence>
        {showMembersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-primary/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="text-primary" /> {viewingClanName}
                </h2>
                <button onClick={() => setShowMembersModal(false)} className="text-textMuted hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {clanMembers.length === 0 ? (
                  <p className="text-textMuted text-sm text-center py-4">No members found.</p>
                ) : (
                  clanMembers.map(m => (
                    <div key={m.id} className="bg-black/40 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold text-sm">{m.user?.name}</p>
                        <p className="text-textMuted text-xs">{m.role}</p>
                      </div>
                      <span className="text-[10px] text-primary">{new Date(m.joined_at).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ban Squad Modal */}
      <AnimatePresence>
        {showBanModal && clanToBan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h2 className="text-xl font-bold text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                Ban {clanToBan.name}
              </h2>
              <form onSubmit={handleBanClan} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Reason for Ban</label>
                  <textarea
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500 transition-colors h-24 resize-none"
                    placeholder="Enter violation details..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowBanModal(false)} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl uppercase text-xs font-bold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-500 rounded-xl uppercase text-xs font-bold transition-colors">
                    Confirm Ban
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Clan Modal */}
      <AnimatePresence>
        {showClanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="text-primary" /> Create Squad
              </h2>
              <form onSubmit={handleCreateClan} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Clan Name</label>
                  <input
                    type="text"
                    value={newClanName}
                    onChange={e => setNewClanName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Clan Tag</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newClanTag}
                    onChange={e => setNewClanTag(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary transition-colors"
                    placeholder="e.g. FNC"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowClanModal(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold uppercase transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-primary hover:bg-primary/90 text-black rounded-lg text-xs font-bold uppercase transition-colors">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
