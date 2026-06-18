import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import PageHeader from '../components/layout/PageHeader';
import NeonCard from '../components/ui/NeonCard';
import { Shield, ShieldAlert, Trophy, Target, Crosshair, Crown, Star, CheckCircle, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PublicProfile() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await api.get(`/users/${id}`);
        setPlayer(res.data);
        
        try {
          const portRes = await api.get(`/career/portfolio/${id}`);
          setPortfolio(portRes.data);
        } catch(e) {
          // No portfolio found
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-display font-black text-red-500 uppercase tracking-widest">Player Not Found</h2>
        <p className="text-textMuted mt-4">This operative does not exist in the database.</p>
      </div>
    );
  }

  const winRate = ((player.wins / Math.max(1, player.wins + player.losses)) * 100).toFixed(1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 relative z-10">
      <PageHeader 
        badge="Operative Dossier" 
        title={player.name}
        subtitle="Public combat records and AI Trust evaluation."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Left Column - ID Card */}
        <NeonCard accent={player.is_flagged ? "red" : "cyan"} className="flex flex-col items-center text-center">
          <div className="relative mb-6 group">
            <div className={`absolute inset-0 bg-${player.is_flagged ? 'red-500' : 'primary'}/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500`}></div>
            <div className="w-32 h-32 rounded-full border-4 border-surface bg-background relative z-10 overflow-hidden flex items-center justify-center">
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-white/20">{player.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            {player.is_flagged && (
              <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-2 rounded-full z-20 border-2 border-background shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <ShieldAlert size={20} />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
            {player.name}
            {player.is_verified_pro && (
              <CheckCircle size={18} className="text-primary drop-shadow-[0_0_8px_rgba(0,245,255,0.6)]" title="Verified Pro Player" />
            )}
          </h2>
          <p className="text-sm text-textMuted font-mono mt-1 mb-4">ID: #{String(player.id).padStart(6, '0')}</p>
          
          <div className="w-full border-t border-white/10 pt-4 flex justify-between items-center px-4">
            <span className="text-xs uppercase font-bold text-textMuted">Tier</span>
            <span className={`text-sm uppercase font-black ${player.tier === 'Bronze' ? 'text-orange-700' : player.tier === 'Silver' ? 'text-gray-400' : 'text-neonGold'}`}>
              {player.tier}
            </span>
          </div>
          <div className="w-full border-t border-white/10 pt-4 mt-4 flex justify-between items-center px-4">
            <span className="text-xs uppercase font-bold text-textMuted">Global Rank</span>
            <span className="text-lg font-black text-white">#{player.rank}</span>
          </div>
        </NeonCard>

        {/* Right Column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Trust Score */}
          <NeonCard accent={player.ai_trust_score < 70 ? "red" : "green"} className="overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {player.is_flagged ? <ShieldAlert className="text-red-500" /> : <Shield className="text-primary" />}
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">AI Trust Evaluation</h3>
              </div>
              <span className={`font-black text-xl ${player.ai_trust_score < 70 ? 'text-red-500' : 'text-primary'}`}>
                {player.ai_trust_score}/100
              </span>
            </div>
            <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${player.ai_trust_score}%` }}
                className={`h-full ${player.ai_trust_score < 70 ? 'bg-red-500' : 'bg-primary'} shadow-[0_0_10px_currentColor]`} 
              />
            </div>
            {player.is_flagged && (
              <p className="text-xs text-red-500 mt-3 font-bold uppercase">
                Warning: This operative has been flagged by the Anti-Cheat Engine.
              </p>
            )}
          </NeonCard>

          {/* Combat Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Win Rate', value: `${winRate}%`, icon: Trophy, color: 'text-neonGold' },
              { label: 'Total Kills', value: player.kills, icon: Crosshair, color: 'text-accent' },
              { label: 'Highest Kill', value: player.best_kill, icon: Target, color: 'text-red-500' },
              { label: 'MVP Awards', value: player.mvps, icon: Star, color: 'text-primary' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <NeonCard key={i} className="flex flex-col items-center justify-center p-4 text-center hover:scale-105 transition-transform duration-300">
                  <Icon className={`${stat.color} mb-2`} size={24} />
                  <span className="text-[10px] text-textMuted font-bold uppercase tracking-widest">{stat.label}</span>
                  <span className="text-xl font-black text-white mt-1">{stat.value}</span>
                </NeonCard>
              );
            })}
          </div>

          <NeonCard accent="purple">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <Crown className="text-accent" size={20} />
              <h3 className="font-bold text-white uppercase tracking-wider text-sm">Competitive MMR</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{Math.floor(player.mmr)}</p>
                <p className="text-xs text-textMuted uppercase mt-1">Matchmaking Rating</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">{player.wins}W - {player.losses}L</p>
                <p className="text-xs text-textMuted uppercase mt-1">Record</p>
              </div>
            </div>
          </NeonCard>

          {/* Player Portfolio */}
          {portfolio && (
            <NeonCard accent="cyan">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <Briefcase className="text-primary" size={20} />
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Professional Portfolio</h3>
              </div>
              <div className="space-y-4">
                {portfolio.bio && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Biography</h4>
                    <p className="text-white text-sm bg-white/5 p-3 rounded-lg leading-relaxed">{portfolio.bio}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {portfolio.preferred_roles && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Roles</h4>
                      <p className="text-white text-sm font-bold bg-surface p-2 rounded border border-white/5">{portfolio.preferred_roles}</p>
                    </div>
                  )}
                  {portfolio.hardware_specs && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hardware</h4>
                      <p className="text-white text-sm font-bold bg-surface p-2 rounded border border-white/5">{portfolio.hardware_specs}</p>
                    </div>
                  )}
                </div>
                {portfolio.past_teams && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Past Teams</h4>
                    <p className="text-white text-sm font-bold bg-surface p-2 rounded border border-white/5">{portfolio.past_teams}</p>
                  </div>
                )}
                {portfolio.looking_for_team && (
                  <span className="inline-block mt-2 bg-neonGreen/20 text-neonGreen px-3 py-1 rounded text-xs font-bold uppercase border border-neonGreen/30 animate-pulse">
                    Looking For Team
                  </span>
                )}
              </div>
            </NeonCard>
          )}

        </div>
      </div>
    </div>
  );
}
