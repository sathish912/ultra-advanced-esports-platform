import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Users, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background"></div>
        
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px]"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-white/10 mb-8 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">AETMS Network Online</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-6 uppercase tracking-tight">
              Dominate the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Digital Arena</span>
            </h1>
            
            <p className="text-lg md:text-xl text-textMuted max-w-2xl mx-auto mb-10 leading-relaxed">
              The ultimate eSports Tournament Management System. Register, compete, and climb the global leaderboards in top competitive titles.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="btn-primary py-4 px-8 text-lg w-full sm:w-auto flex items-center justify-center gap-2">
                <Gamepad2 size={24} /> Enter Arena
              </Link>
              <Link to="/tournaments" className="btn-secondary py-4 px-8 text-lg w-full sm:w-auto">
                View Scrims
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-surface/30 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8 rounded-2xl"
            >
              <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center text-primary mb-6">
                <Trophy size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Tournaments</h3>
              <p className="text-textMuted leading-relaxed">Join active tournaments across various gaming titles. Track brackets and match schedules in real-time.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-8 rounded-2xl"
            >
              <div className="w-14 h-14 bg-secondary/20 rounded-xl flex items-center justify-center text-secondary mb-6">
                <Zap size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real-time Stats</h3>
              <p className="text-textMuted leading-relaxed">Instant leaderboard updates and performance tracking. Monitor your kill count, win rate, and MVP status.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-8 rounded-2xl"
            >
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center text-accent mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Team Management</h3>
              <p className="text-textMuted leading-relaxed">Form squads, manage rosters, and register together for team-based combat missions and tournaments.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
