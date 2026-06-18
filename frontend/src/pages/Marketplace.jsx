import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Star, Wallet, Lock, Unlock, ShieldAlert, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api';

export default function Marketplace() {
  const { user, fetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState('store');
  const [storeItems, setStoreItems] = useState([]);
  const [battlePass, setBattlePass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, bpRes] = await Promise.all([
        api.get('/marketplace/store/items'),
        api.get('/marketplace/battlepass/current')
      ]);
      setStoreItems(itemsRes.data);
      setBattlePass(bpRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (itemId, price) => {
    if (user.wallet_balance < price) {
      toast.error('Insufficient wallet balance');
      return;
    }
    setProcessing(true);
    try {
      await api.post(`/marketplace/store/buy/${itemId}`);
      toast.success('Purchase successful!');
      fetchUser();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to purchase item');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeBP = async () => {
    setProcessing(true);
    try {
      await api.post('/marketplace/battlepass/upgrade');
      toast.success('Battle Pass Upgraded to Premium!');
      fetchUser();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upgrade Battle Pass');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 pt-8 pb-20 relative z-10">
      {/* Background Grid & Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[150px] mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        
        {/* Header - Cyberpunk Theme */}
        <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-cyan-500/20 text-cyan-400 text-xs font-black px-3 py-1 uppercase tracking-widest rounded inline-flex items-center gap-2 border border-cyan-500/30">
                <Zap size={12} /> Global Economy
              </span>
              <span className="bg-purple-500/20 text-purple-400 text-xs font-black px-3 py-1 uppercase tracking-widest rounded inline-flex items-center gap-2 border border-purple-500/30">
                <Sparkles size={12} /> Premium Content
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase tracking-tighter">
              The Emporium
            </h1>
            <p className="text-gray-400 text-sm uppercase tracking-wider mt-2 flex items-center gap-2">
              Secure Asset Acquisition Network <ChevronRight size={14} className="text-cyan-500" />
            </p>
          </div>

          {user && (
            <div className="bg-black/60 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-3 rounded-lg border border-white/5">
                  <Wallet className="text-cyan-400 w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Available Balance</p>
                  <p className="text-2xl font-black text-white">₹{user.wallet_balance?.toFixed(2) ?? '0.00'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-10">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all rounded-lg ${
              activeTab === 'store' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2"><ShoppingBag size={16} /> Merchandise</span>
          </button>
          <button
            onClick={() => setActiveTab('battlepass')}
            className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all rounded-lg ${
              activeTab === 'battlepass' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2"><Star size={16} /> Battle Pass</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storeItems.map((item) => (
              <div key={item.id} className="bg-black/40 border border-white/10 rounded-xl hover:border-cyan-500/50 group transition-all duration-300 relative overflow-hidden backdrop-blur-sm">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-purple-500/5 transition-all duration-500"></div>
                
                <div className="absolute top-4 right-4 bg-black/80 text-cyan-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 border border-cyan-500/30">
                  {item.item_type}
                </div>
                
                <div className="h-48 w-full bg-gray-900 relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100 mix-blend-luminosity group-hover:mix-blend-normal" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 border-b border-white/5">
                      <ShoppingBag size={48} className="text-gray-700" />
                    </div>
                  )}
                  {/* Inner overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                </div>
                
                <div className="p-6 relative z-10">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 group-hover:text-cyan-400 transition-colors">{item.name}</h3>
                  <p className="text-gray-400 text-sm mb-6 h-10 leading-relaxed">{item.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xl font-black text-white">₹{item.price}</span>
                    <button
                      onClick={() => handleBuyItem(item.id, item.price)}
                      disabled={processing || item.stock === 0}
                      className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/50 hover:border-cyan-500 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-cyan-400 font-bold py-2 px-6 rounded text-xs uppercase tracking-widest transition-all duration-300"
                    >
                      {item.stock === 0 ? 'Sold Out' : 'Purchase'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'battlepass' && battlePass?.season && (
          <div className="space-y-6">
            {/* BP Header */}
            <div className="bg-gradient-to-r from-purple-900/40 to-black border border-purple-500/30 rounded-2xl p-8 md:p-12 relative overflow-hidden backdrop-blur-md">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-screen" style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}></div>
              <div className="absolute -right-20 -top-20 opacity-5">
                <Star size={300} className="text-purple-500" />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    <p className="text-purple-400 font-bold uppercase tracking-widest text-xs">Active Season</p>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white uppercase tracking-tighter mb-6">{battlePass.season.name}</h2>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="bg-black/50 border border-white/10 text-white font-bold px-4 py-2 text-sm uppercase tracking-widest rounded-lg flex items-center gap-2">
                      <Zap size={14} className="text-yellow-400" /> Current XP: {battlePass.progress.current_xp}
                    </span>
                    <span className={`font-bold px-4 py-2 text-sm uppercase tracking-widest flex items-center gap-2 rounded-lg border ${
                      battlePass.progress.is_premium_unlocked 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                        : 'bg-black/50 border-white/10 text-gray-400'
                    }`}>
                      {battlePass.progress.is_premium_unlocked ? <><Unlock size={14} /> Premium Active</> : <><Lock size={14} /> Standard Pass</>}
                    </span>
                  </div>
                </div>

                {!battlePass.progress.is_premium_unlocked && (
                  <button 
                    onClick={handleUpgradeBP}
                    disabled={processing}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-black uppercase tracking-widest py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all flex items-center gap-3"
                  >
                    <Unlock size={18} />
                    Unlock Premium (₹499)
                  </button>
                )}
              </div>
            </div>

            {/* BP Track */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
              <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                <Star size={20} className="text-purple-500" /> Reward Track
              </h3>
              
              <div className="space-y-4 relative">
                {/* Connecting Line */}
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-white/5 rounded-full z-0"></div>

                {battlePass.tiers.map((tier) => {
                  const isUnlocked = battlePass.progress.current_xp >= tier.required_xp;
                  const canClaim = isUnlocked && (!tier.is_premium || battlePass.progress.is_premium_unlocked);
                  
                  return (
                    <div key={tier.id} className={`flex items-center gap-6 p-4 rounded-xl transition-all relative z-10 ${
                      canClaim 
                        ? 'bg-black/60 border border-purple-500/30 hover:border-purple-500/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' 
                        : 'bg-black/20 border border-white/5 opacity-60'
                    }`}>
                      {/* Tier Number Indicator */}
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shrink-0 ${
                        canClaim 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                          : 'bg-white/5 text-gray-500 border border-white/10'
                      }`}>
                        {tier.tier_level}
                      </div>

                      {/* Reward Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          {tier.is_premium && (
                            <span className="bg-purple-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Premium</span>
                          )}
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Requires {tier.required_xp} XP</span>
                        </div>
                        <h4 className={`text-lg font-black uppercase tracking-tight ${canClaim ? 'text-white' : 'text-gray-500'}`}>
                          {tier.reward_name}
                        </h4>
                      </div>

                      {/* Status */}
                      <div className="shrink-0 pr-4">
                        {canClaim ? (
                          <span className="text-purple-400 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
                            <Unlock size={16} /> Unlocked
                          </span>
                        ) : (
                          <span className="text-gray-600 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
                            <Lock size={16} /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
