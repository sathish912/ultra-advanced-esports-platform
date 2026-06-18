import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Tv, PlayCircle, Radio, Clock, Video, MessageSquare, Send, Sparkles, Trophy, Vote, Map as MapIcon, Crosshair, MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function EsportsTV() {
  const [tournaments, setTournaments] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [clips, setClips] = useState([]);
  const [tvTab, setTvTab] = useState('live'); // 'live' or 'clips'
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = sessionStorage.getItem('esports_chat');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatInput, setChatInput] = useState('');
  const [ws, setWs] = useState(null);
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  // Superchat Modal State
  const [showSuperchatModal, setShowSuperchatModal] = useState(false);
  const [superchatAmount, setSuperchatAmount] = useState('');
  const [superchatMessage, setSuperchatMessage] = useState('');
  const predefinedAmounts = [50, 100, 200, 500, 1000];

  // MVP Voting State
  const [showMVPModal, setShowMVPModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [mvpResults, setMvpResults] = useState([]);
  const [leaderboardPool, setLeaderboardPool] = useState([]);

  const fetchMVPResults = async (matchId) => {
    try {
      const res = await api.get(`/audience/match/${matchId}/mvp-results`);
      setMvpResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoteClick = async (matchId) => {
    setSelectedMatchId(matchId);
    setShowMVPModal(true);
    fetchMVPResults(matchId);
    if (leaderboardPool.length === 0) {
      const lbRes = await api.get('/ranking/leaderboard?limit=20');
      setLeaderboardPool(lbRes.data.map(item => ({
        id: item.player_id,
        name: item.name,
        avatar: item.avatar
      })));
    }
  };

  const castMVPVote = async (playerId) => {
    try {
      await api.post(`/audience/match/${selectedMatchId}/mvp-vote`, { player_id: playerId });
      toast.success('MVP Vote Cast!');
      fetchMVPResults(selectedMatchId);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cast vote');
    }
  };

  const verifySuperchatPayment = async (sessionId) => {
    try {
      // Keep existing verify if they return via redirect (fallback)
      await api.post(`/verify-superchat-razorpay`, { razorpay_payment_id: sessionId });
      toast.success("Paid Superchat successfully sent!");
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Superchat verification failed");
    }
  };

    const fetchStreamsData = async () => {
      try {
        const [tRes, sRes, cRes] = await Promise.all([
          api.get('/tournaments'),
          api.get('/streaming/live'),
          api.get('/streaming/clips').catch(() => ({ data: [] }))
        ]);
        setTournaments(tRes.data);
        setLiveStreams(sRes.data);
        setClips(cRes.data || []);
      
      if (sRes.data.length === 0) {
        setChatMessages([]);
        sessionStorage.removeItem('esports_chat');
      } else {
        // Fetch recent superchats only if stream is live
        api.get('/superchat/recent').then(res => {
          if (res.data && res.data.length > 0) {
            setChatMessages(prev => {
              const welcomeMsg = prev.length > 0 && !prev[0].amount && !prev[0].timestamp ? prev[0] : null;
              return welcomeMsg ? [welcomeMsg, ...res.data].filter(Boolean) : [...res.data];
            });
            setTimeout(() => {
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
          }
        }).catch(console.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('esports_chat', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    fetchStreamsData();

    // Initialize WebSocket for Chat
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (sessionId) {
        verifySuperchatPayment(sessionId);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CHAT' || data.type === 'SUPER_CHAT') {
          setChatMessages(prev => [...prev, data]);
          setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (err) {
        console.error(err);
      }
    };

    setWs(socket);

    return () => socket.close();
  }, []);

  const sendMessage = (e, isSuper = false) => {
    e?.preventDefault();
    if (!chatInput.trim() || !ws || !user) {
      if (!user) toast.error("You must be logged in to chat");
      return;
    }
    
    const msg = {
      type: isSuper ? 'SUPER_CHAT' : 'CHAT',
      user: user.name,
      avatar: user.avatar,
      content: chatInput,
      timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(msg));
    setChatInput('');
  };

  const handleSuperchatSubmit = async (e) => {
    e.preventDefault();
    if (!superchatMessage.trim() || !superchatAmount || isNaN(superchatAmount) || Number(superchatAmount) < 50) {
      toast.error("Please enter a message and an amount of at least ₹50.");
      return;
    }
    
    try {
      const res = await api.post('/superchat/razorpay-order', {
        amount: Number(superchatAmount),
        message: superchatMessage
      });
      
      if (res.data.order_id) {
          const options = {
              "key": res.data.key_id,
              "amount": res.data.amount,
              "currency": res.data.currency,
              "name": "ULTRA ESPORTS",
              "description": "Esports TV Superchat",
              "order_id": res.data.order_id,
              "handler": async function (response) {
                  try {
                      await api.post('/verify-superchat-razorpay', {
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_signature: response.razorpay_signature
                      });
                      toast.success("Superchat successfully sent!");
                      setShowSuperchatModal(false);
                      setSuperchatMessage('');
                      setSuperchatAmount('');
                  } catch (err) {
                      toast.error('Payment verification failed');
                  }
              },
              "theme": {
                  "color": "#eab308"
              }
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
              toast.error(response.error.description);
          });
          rzp.open();
      } else {
          toast.error("Failed to create Razorpay order");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Transaction failed.");
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // Basic YouTube embed conversion
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('youtube.com/watch?v=', 'youtube.com/embed/').split('&')[0];
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
    }
    if (url.includes('youtube.com/live/')) {
      const id = url.split('youtube.com/live/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    // Basic Twitch embed conversion
    if (url.includes('twitch.tv/')) {
      const channel = url.split('twitch.tv/')[1];
      return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    }
    return url;
  };

  const pastBroadcasts = tournaments.filter(t => t.status === 'Completed' && t.recording_url);

  if (loading) return <div className="text-center p-12 text-secondary">Tuning in...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center border-b border-white/10 pb-8">
        <Tv size={48} className="mx-auto text-red-500 mb-4 animate-pulse" />
        <h1 className="text-4xl font-display font-bold text-white uppercase tracking-widest mb-2 flex items-center justify-center gap-3">
          Esports TV <span className="bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">LIVE</span>
        </h1>
        <p className="text-textMuted uppercase tracking-wider text-sm mb-6">
          Watch your favorite operatives battle it out in real-time.
        </p>

        {/* TV Tabs */}
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => setTvTab('live')}
            className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider transition-all ${
              tvTab === 'live' 
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-surface border border-white/10 text-textMuted hover:text-white'
            }`}
          >
            Live & VODs
          </button>
          <button 
            onClick={() => setTvTab('clips')}
            className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider transition-all ${
              tvTab === 'clips' 
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(157,78,221,0.5)]'
                : 'bg-surface border border-white/10 text-textMuted hover:text-white'
            }`}
          >
            Highlights Feed
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {!(user?.is_premium || user?.role === 'admin') ? (
          <div className="w-full flex-col flex items-center justify-center p-20 glass-panel rounded-2xl border border-yellow-500/30">
            <Sparkles size={64} className="text-yellow-500 mb-6" />
            <h2 className="text-3xl font-bold text-white uppercase mb-4 text-center">Premium Access Required</h2>
            <p className="text-textMuted text-center max-w-lg">
              Live streams and the global chat are exclusive to Premium operatives. 
              Upgrade your clearance level to gain access to Esports TV.
            </p>
          </div>
        ) : tvTab === 'clips' ? (
          <div className="w-full flex justify-center pb-20">
            <div className="w-full max-w-sm lg:max-w-md h-[80vh] overflow-y-scroll snap-y snap-mandatory hide-scrollbar rounded-2xl border border-white/10 bg-black">
              {clips.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-textMuted">
                  <Video size={48} className="mb-4 opacity-50" />
                  <p>No highlights generated yet.</p>
                </div>
              ) : (
                clips.map((clip, idx) => (
                  <div key={clip.id} className="w-full h-full snap-start relative bg-black group">
                    <video 
                      src={clip.clip_url} 
                      className="w-full h-full object-cover"
                      controls
                      autoPlay={idx === 0}
                      loop
                      muted={idx !== 0}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent z-10 pointer-events-none">
                      <h3 className="text-white font-bold text-lg mb-1">{clip.description}</h3>
                      <p className="text-primary text-sm font-semibold flex items-center gap-2">
                        <Sparkles size={14} /> AI Highlight
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Main Content - Streams */}
            <div className="flex-1 space-y-12">
          {/* LIVE STREAMS */}
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Radio className="text-red-500" /> Currently Live
            </h2>
            {liveStreams.length === 0 ? (
              <div className="glass-panel p-8 text-center text-textMuted rounded-xl">
                <Video className="mx-auto mb-4 opacity-50" size={32} />
                No tournaments are currently broadcasting. Check the schedule!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {liveStreams.map(s => {
                  const matchInfo = s.match_id ? `Match #${s.match_id}` : "Broadcast";
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl overflow-hidden border border-red-500/30">
                      <div className="bg-surface/80 p-4 border-b border-white/10 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-white text-lg">{s.title || 'Live Broadcast'}</h3>
                          <p className="text-xs text-textMuted uppercase tracking-wider">{matchInfo} • {s.platform}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-textMuted flex items-center gap-1">
                            <Tv size={14} /> {s.viewer_count.toLocaleString()} Viewers
                          </span>
                          <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live
                          </span>
                        </div>
                      </div>
                      <div className="aspect-video bg-black relative group">
                        <iframe 
                          src={getEmbedUrl(s.stream_url)} 
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0" 
                          allowFullScreen 
                          title={s.title}
                        ></iframe>
                        
                        {/* Spectator System Overlay */}
                        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-start pointer-events-none z-10">
                            <div className="flex flex-col gap-1">
                                <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded w-fit flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Spectator Mode
                                </span>
                                <span className="text-[10px] font-mono text-white/50 px-1">CAM: AUTO-DIRECTOR</span>
                            </div>
                            <div className="flex gap-2 pointer-events-auto">
                                <button onClick={() => toast.success('Simulating Mini-map Overlay...')} className="bg-black/60 backdrop-blur-sm hover:bg-black/90 border border-white/20 text-white p-1.5 rounded cursor-pointer transition-all hover:border-primary group/btn" title="Toggle Minimap">
                                    <MapIcon size={16} className="group-hover/btn:text-primary"/>
                                </button>
                                <button onClick={() => toast.success('Switching to Player POV...')} className="bg-black/60 backdrop-blur-sm hover:bg-black/90 border border-white/20 text-white p-1.5 rounded cursor-pointer transition-all hover:border-primary group/btn" title="Player POV">
                                    <Crosshair size={16} className="group-hover/btn:text-primary"/>
                                </button>
                                <button onClick={() => toast.success('Auto-Director Enabled')} className="bg-primary/20 backdrop-blur-sm hover:bg-primary/40 border border-primary/50 text-primary p-1.5 rounded cursor-pointer transition-all group/btn" title="Auto Director">
                                    <MonitorPlay size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex justify-between items-end z-10">
                            <div className="space-y-1 w-64">
                                <div className="text-[10px] font-mono bg-black/50 px-2 py-1 rounded text-red-400 border-l-2 border-red-500">
                                    [KILLFEED] ViperStrike eliminated ShadowSniper
                                </div>
                                <div className="text-[10px] font-mono bg-black/50 px-2 py-1 rounded text-green-400 border-l-2 border-green-500">
                                    [KILLFEED] CyberNinja eliminated IronGladiator
                                </div>
                            </div>
                        </div>
                      </div>
                      <div className="bg-surface/80 p-4 border-t border-white/10 flex justify-between items-center">
                        <button 
                          onClick={() => handleVoteClick(s.match_id || 1)}
                          className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                        >
                          <Vote size={16} /> Live MVP Voting
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAST BROADCASTS (VODS) */}
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="text-primary" /> Recent VODs
            </h2>
            {pastBroadcasts.length === 0 ? (
              <div className="glass-panel p-8 text-center text-textMuted rounded-xl">
                No recent broadcasts available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastBroadcasts.map(t => (
                  <div key={t.id} className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors" onClick={() => window.open(t.stream_url, '_blank')}>
                    <div className="h-40 relative flex items-center justify-center bg-surface">
                      {t.banner ? (
                        <img src={t.banner} alt={t.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      ) : (
                        <Tv className="text-white/20" size={48} />
                      )}
                      <PlayCircle className="text-white z-10 opacity-80 hover:opacity-100 hover:scale-110 transition-all shadow-lg rounded-full" size={48} />
                    </div>
                    <div className="p-4 bg-surface">
                      <h3 className="font-bold text-white truncate">{t.name}</h3>
                      <p className="text-xs text-textMuted uppercase">{t.game}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Chat Sidebar */}
        <div className="w-full lg:w-96 flex flex-col h-[600px] lg:h-auto glass-panel rounded-2xl overflow-hidden border border-white/10 sticky top-24">
          <div className="p-4 border-b border-white/10 bg-surface/80 flex items-center justify-between">
            <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" /> Live Chat
            </h3>
            <span className="text-xs text-textMuted bg-background px-2 py-1 rounded-full">Global</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface/30">
            {liveStreams.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-textMuted text-sm text-center">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                Chat is currently offline.<br/>Old messages have been cleared.
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-textMuted text-sm text-center">
                Welcome to the live chat! <br/> Say hello to the community.
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={idx} 
                  className={`text-sm rounded-lg p-3 ${msg.type === 'SUPER_CHAT' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50' : 'bg-surface border border-white/5'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        {msg.user.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`font-bold ${msg.type === 'SUPER_CHAT' ? 'text-yellow-400' : 'text-primary'}`}>
                      {msg.user}
                    </span>
                    {msg.type === 'SUPER_CHAT' && (
                      <span className="text-xs font-bold text-black bg-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Sparkles size={10} /> SUPER {msg.amount ? `₹${msg.amount}` : ''}
                      </span>
                    )}
                    <span className="text-[10px] text-textMuted ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white/90 break-words ml-8">{msg.content}</p>
                </motion.div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 bg-surface/80">
            <form onSubmit={(e) => sendMessage(e, false)} className="flex flex-col gap-2">
              <div className="flex items-center bg-background border border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={liveStreams.length === 0 ? "Chat is disabled (Stream Offline)" : "Send a message..."}
                  className="flex-1 bg-transparent border-none text-white px-4 py-3 text-sm focus:outline-none"
                  disabled={!user || liveStreams.length === 0}
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || !user || liveStreams.length === 0}
                  className="p-3 text-textMuted hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </div>
              <button 
                type="button"
                onClick={() => setShowSuperchatModal(true)}
                disabled={!user || liveStreams.length === 0}
                className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={14} /> {liveStreams.length === 0 ? "Superchat Unavailable" : "Send Paid Super Chat"}
              </button>
            </form>
            {!user && liveStreams.length > 0 && (
              <p className="text-xs text-textMuted text-center mt-2">Log in to participate in chat.</p>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* Superchat Modal */}
      {showSuperchatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-yellow-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-yellow-500/10"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <Sparkles className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Send Paid Superchat</h2>
            </div>
            
            <form onSubmit={handleSuperchatSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Select Amount (INR ₹)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {predefinedAmounts.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSuperchatAmount(amt.toString())}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        superchatAmount === amt.toString() 
                          ? 'bg-yellow-500 text-black' 
                          : 'bg-background text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/10'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted font-bold">₹</span>
                  <input
                    type="number"
                    min="50"
                    value={superchatAmount}
                    onChange={(e) => setSuperchatAmount(e.target.value)}
                    placeholder="Custom amount (Min ₹50)..."
                    className="input-field pl-8 w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Your Message</label>
                <textarea
                  value={superchatMessage}
                  onChange={(e) => setSuperchatMessage(e.target.value)}
                  placeholder="Type your highlighted message..."
                  className="input-field w-full h-24 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSuperchatModal(false)}
                  className="flex-1 py-3 bg-background hover:bg-white/5 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                  Checkout
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MVP Voting Modal */}
      {showMVPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-primary/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-primary/10 max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Trophy className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">MVP Voting</h2>
              </div>
              <button onClick={() => setShowMVPModal(false)} className="text-textMuted hover:text-white uppercase text-xs font-bold">Close</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              
              {/* Current Leaders */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Vote Leaders</h3>
                {mvpResults.length === 0 ? (
                  <p className="text-sm text-textMuted italic">No votes cast yet. Be the first!</p>
                ) : (
                  <div className="space-y-3">
                    {mvpResults.map((res, idx) => {
                      const totalVotes = mvpResults.reduce((sum, r) => sum + r.votes, 0);
                      const percent = Math.round((res.votes / totalVotes) * 100) || 0;
                      return (
                        <div key={res.player_id} className="relative bg-white/5 rounded-xl p-3 border border-white/10 overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 bg-primary/20" style={{ width: `${percent}%` }}></div>
                          <div className="relative flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{idx + 1}. {res.player_name}</span>
                            </div>
                            <span className="font-bold text-primary text-sm">{res.votes} <span className="text-[10px] text-textMuted">VOTES</span> ({percent}%)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Vote Pool */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cast Your Vote</h3>
                <div className="grid grid-cols-1 gap-2">
                  {leaderboardPool.map(player => (
                    <div key={player.id} className="flex justify-between items-center p-3 rounded-lg bg-background border border-white/5 hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black overflow-hidden flex items-center justify-center font-bold text-xs text-white">
                          {player.avatar ? <img src={player.avatar} alt="avatar" className="w-full h-full object-cover" /> : player.name[0]}
                        </div>
                        <span className="font-bold text-white text-sm">{player.name}</span>
                      </div>
                      <button 
                        onClick={() => castMVPVote(player.id)}
                        className="bg-primary hover:bg-primary/90 text-black px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors"
                      >
                        Vote
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
