import React from 'react';
import { Gamepad2, Shield, Trophy, Globe, Zap, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-16 py-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block p-4 bg-primary/10 rounded-full border border-primary/20 mb-4"
        >
          <Gamepad2 size={64} className="text-primary" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-5xl md:text-7xl font-display font-bold text-white uppercase tracking-widest"
        >
          About <span className="text-primary">ULTRA ESPORTS</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-textMuted max-w-3xl mx-auto uppercase tracking-wider"
        >
          Advanced eSports Tournament Management System. The ultimate battleground for elite operatives and competitive gamers worldwide.
        </motion.p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          {
            icon: <Trophy size={32} className="text-yellow-500" />,
            title: "Competitive Tournaments",
            desc: "Join high-stakes tournaments with massive prize pools. Compete against the best and climb the ranks."
          },
          {
            icon: <Shield size={32} className="text-primary" />,
            title: "Anti-Cheat Engine",
            desc: "Our proprietary behavior-analysis system ensures fair play and instantly flags suspicious activity."
          },
          {
            icon: <Zap size={32} className="text-blue-500" />,
            title: "Instant Payouts",
            desc: "Integrated wallet system ensures tournament winnings are credited directly to your account immediately."
          },
          {
            icon: <Globe size={32} className="text-purple-500" />,
            title: "Global Leaderboards",
            desc: "Track your stats, win rates, and MVP awards. See where you stand against players worldwide."
          },
          {
            icon: <Users size={32} className="text-pink-500" />,
            title: "Esports TV",
            desc: "Watch live matches, interact with the community, and send paid superchats to support your favorite players."
          },
          {
            icon: <Gamepad2 size={32} className="text-accent" />,
            title: "Premium Tier",
            desc: "Unlock exclusive access to tournaments, live streams, and advanced analytics with our Premium plan."
          }
        ].map((feature, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors group cursor-default"
          >
            <div className="mb-6 p-4 bg-background rounded-xl inline-block group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-3">{feature.title}</h3>
            <p className="text-textMuted leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Mission Statement */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="glass-panel p-12 rounded-3xl text-center border border-white/5 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-display font-bold text-white uppercase tracking-widest">Our Mission</h2>
          <p className="text-lg text-textMuted leading-loose">
            At ULTRA ESPORTS, we believe that competitive gaming is more than just a hobby—it's a discipline. 
            Our platform provides the infrastructure needed to host, participate, and manage high-stakes 
            tournaments. With integrated AI-driven analytics, live streaming features, and a secure monetization wallet, 
            ULTRA ESPORTS is your central hub for everything esports.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
