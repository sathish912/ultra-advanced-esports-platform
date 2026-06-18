import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import NeonCard from '../components/ui/NeonCard';
import {
  Gamepad2,
  Trophy,
  Users,
  Zap,
  Shield,
  Brain,
  Radio,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: Trophy,
    title: 'Live Tournaments',
    desc: 'Knockout brackets, auto scheduling, and real-time status across BGMI, Valorant, CS2 & more.',
    accent: 'cyan',
  },
  {
    icon: Zap,
    title: 'Dynamic Rankings',
    desc: 'ELO-style tiers from Bronze to Immortal. Global, weekly, and seasonal leaderboards.',
    accent: 'magenta',
  },
  {
    icon: Radio,
    title: 'Esports TV',
    desc: 'Multi-stream viewing, live chat, superchats, and match result broadcasts.',
    accent: 'purple',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat AI',
    desc: 'Suspicious activity flagging, dispute resolution, and admin moderation tools.',
    accent: 'gold',
  },
  {
    icon: Brain,
    title: 'Smart Analytics',
    desc: 'Performance grades, win rate tracking, and admin finance dashboards.',
    accent: 'cyan',
  },
  {
    icon: Users,
    title: 'Social & Clans',
    desc: 'Global chat, community hub, and clan systems — expanding every sprint.',
    accent: 'magenta',
  },
];

export default function Home() {
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    api
      .get('/tournaments')
      .then((res) => {
        const live = (res.data || []).filter((t) => t.status === 'Ongoing').length;
        setLiveCount(live);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative">
      <section className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void via-background/90 to-void" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center py-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-primary/30 mb-8">
              <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                Ultra Network Online • {liveCount} Live Events
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black uppercase tracking-tight leading-[0.95] mb-6">
              <span className="block text-white">Enter The</span>
              <span className="block neon-text-magenta mt-1">Ultra Arena</span>
            </h1>

            <p className="text-lg md:text-xl text-textMuted max-w-2xl mx-auto mb-10 leading-relaxed">
              Professional esports infrastructure — tournaments, rankings, streaming, wallets, and
              AI-powered competition in one cyberpunk competitive network.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="btn-primary py-4 px-10 text-base w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Gamepad2 size={22} /> Deploy Now
              </Link>
              <Link
                to="/arena"
                className="btn-secondary py-4 px-10 text-base w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Open Arena <ChevronRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative z-10 border-t border-white/5 bg-surface/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Platform Modules
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white mt-3 uppercase">
              Built For Champions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <NeonCard key={f.title} accent={f.accent} delay={i * 0.06}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, rgba(0,245,255,0.1), rgba(255,43,214,0.08))`,
                  }}
                >
                  <f.icon size={28} className="text-primary" />
                </div>
                <h3 className="text-lg font-display font-bold text-white mb-2">{f.title}</h3>
                <p className="text-textMuted text-sm leading-relaxed">{f.desc}</p>
              </NeonCard>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 glass-panel-neon rounded-3xl p-8 md:p-12 text-center border-secondary/20"
          >
            <h3 className="text-2xl font-display font-black text-white uppercase mb-3">
              Ready to compete?
            </h3>
            <p className="text-textMuted mb-6 max-w-xl mx-auto">
              Browse open registrations, climb the leaderboard, and watch live on Esports TV.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/tournaments" className="btn-primary">
                View Tournaments
              </Link>
              <Link to="/leaderboard" className="btn-ghost border border-white/10">
                Rankings
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
