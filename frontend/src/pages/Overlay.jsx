import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

export default function Overlay() {
  const { matchId } = useParams();
  const { subscribe } = useSocket();
  const [matchData, setMatchData] = useState(null);
  const [superchats, setSuperchats] = useState([]);

  useEffect(() => {
    // Add transparent background class to body for OBS
    document.body.style.backgroundColor = 'transparent';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await api.get(`/matches/${matchId}`);
        setMatchData(res.data);
      } catch (err) {
        console.error("Failed to load match data for overlay", err);
      }
    };
    fetchMatch();
    const interval = setInterval(fetchMatch, 5000); // Poll for score updates
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    return subscribe((data) => {
      if (data.type === 'SUPER_CHAT') {
        const newChat = { ...data, id: Date.now() };
        setSuperchats(prev => [...prev, newChat]);
        // Remove superchat after 8 seconds
        setTimeout(() => {
          setSuperchats(prev => prev.filter(c => c.id !== newChat.id));
        }, 8000);
      }
    });
  }, [subscribe]);

  if (!matchData) return null;

  return (
    <div className="w-screen h-screen overflow-hidden relative font-display">
      {/* Top Scoreboard Bar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/80 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        
        {/* Player 1 */}
        <div className="flex items-center gap-4 px-6">
          <div className="text-right">
            <h2 className="text-white font-black text-xl uppercase tracking-wider">{matchData.player1?.name || 'Player 1'}</h2>
            <p className="text-accent text-sm font-bold uppercase">{matchData.player1_kills || 0} Kills</p>
          </div>
          <div className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(0,255,63,0.5)]">
            {matchData.player1_score || 0}
          </div>
        </div>

        {/* VS Badge */}
        <div className="px-4 py-2 bg-gradient-to-b from-primary/20 to-transparent border border-primary/30 rounded-lg flex flex-col items-center justify-center">
          <span className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Round {matchData.round}</span>
          <span className="text-white font-black text-lg italic">VS</span>
        </div>

        {/* Player 2 */}
        <div className="flex items-center gap-4 px-6">
          <div className="text-4xl font-black text-neonGold drop-shadow-[0_0_10px_rgba(255,184,0,0.5)]">
            {matchData.player2_score || 0}
          </div>
          <div className="text-left">
            <h2 className="text-white font-black text-xl uppercase tracking-wider">{matchData.player2?.name || 'Player 2'}</h2>
            <p className="text-accent text-sm font-bold uppercase">{matchData.player2_kills || 0} Kills</p>
          </div>
        </div>
      </div>

      {/* Superchat popups area (Bottom Left) */}
      <div className="absolute bottom-12 left-8 w-96 flex flex-col gap-4">
        <AnimatePresence>
          {superchats.map(chat => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-gradient-to-r from-neonGold/20 to-black/80 backdrop-blur-md border border-neonGold/50 rounded-xl p-4 shadow-[0_0_20px_rgba(255,184,0,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-neonGold"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-neonGold/20 flex items-center justify-center text-neonGold font-black text-lg">
                  {chat.user.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-white font-bold uppercase tracking-wider">{chat.user}</h4>
                  <p className="text-neonGold font-black text-sm">DONATED ₹{chat.amount}</p>
                </div>
              </div>
              <p className="text-white/90 font-medium italic">"{chat.content}"</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Monetization / Sponsor Banner (Bottom Right) */}
      <div className="absolute bottom-12 right-8 bg-black/80 backdrop-blur-md border border-primary/30 p-4 rounded-xl flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/20 rounded flex items-center justify-center">
          <span className="text-primary text-2xl font-black">₹</span>
        </div>
        <div>
          <p className="text-white text-sm font-bold uppercase tracking-widest">Sponsored By</p>
          <p className="text-primary font-black text-xl uppercase">Ultra eSports</p>
        </div>
      </div>
    </div>
  );
}
