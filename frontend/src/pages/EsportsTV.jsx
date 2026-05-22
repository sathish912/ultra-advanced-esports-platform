import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Tv, PlayCircle, Radio, Clock, Video, MessageSquare, Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function EsportsTV() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [ws, setWs] = useState(null);
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchTournaments();

    // Initialize WebSocket for Chat
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/ws`;
    const socket = new WebSocket(wsUrl);

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

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const liveStreams = tournaments.filter(t => t.status === 'Ongoing' && t.stream_url);
  const pastBroadcasts = tournaments.filter(t => t.status === 'Completed' && t.stream_url);

  if (loading) return <div className="text-center p-12 text-secondary">Tuning in...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center border-b border-white/10 pb-8">
        <Tv size={48} className="mx-auto text-red-500 mb-4 animate-pulse" />
        <h1 className="text-4xl font-display font-bold text-white uppercase tracking-widest mb-2 flex items-center justify-center gap-3">
          Esports TV <span className="bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">LIVE</span>
        </h1>
        <p className="text-textMuted uppercase tracking-wider text-sm">
          Watch your favorite operatives battle it out in real-time.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
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
                {liveStreams.map(t => (
                  <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl overflow-hidden border border-red-500/30">
                    <div className="bg-surface/80 p-4 border-b border-white/10 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white text-lg">{t.name}</h3>
                        <p className="text-xs text-textMuted uppercase tracking-wider">{t.game}</p>
                      </div>
                      <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live
                      </span>
                    </div>
                    <div className="aspect-video bg-black relative">
                      <iframe 
                        src={getEmbedUrl(t.stream_url)} 
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0" 
                        allowFullScreen 
                        title={t.name}
                      ></iframe>
                    </div>
                  </motion.div>
                ))}
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
            {chatMessages.length === 0 ? (
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
                        <Sparkles size={10} /> SUPER
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
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent border-none text-white px-4 py-3 text-sm focus:outline-none"
                  disabled={!user}
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || !user}
                  className="p-3 text-textMuted hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </div>
              <button 
                type="button"
                onClick={(e) => sendMessage(e, true)}
                disabled={!chatInput.trim() || !user}
                className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={14} /> Send Free Super Chat
              </button>
            </form>
            {!user && (
              <p className="text-xs text-textMuted text-center mt-2">Log in to participate in chat.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
