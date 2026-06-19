import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Star, Wallet, Lock, Unlock, ShieldAlert, Shield, Zap, ChevronRight, Sparkles, CheckCircle, Edit3, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api';

export default function Marketplace() {
  const { user, fetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState('store');
  const [storeItems, setStoreItems] = useState([]);
  const [battlePass, setBattlePass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedBpTier, setSelectedBpTier] = useState(1);
  const [bpPurchasers, setBpPurchasers] = useState([]);

  // Group Battle Pass tiers by level
  const bpLevels = battlePass?.season ? Array.from(new Set(battlePass.tiers.map(t => t.tier_level))).sort((a, b) => a - b) : [];
  const groupedTiers = {};
  if (battlePass?.season) {
    battlePass.tiers.forEach(tier => {
      if (!groupedTiers[tier.tier_level]) {
        groupedTiers[tier.tier_level] = { free: null, premium: null };
      }
      if (tier.is_premium) {
        groupedTiers[tier.tier_level].premium = tier;
      } else {
        groupedTiers[tier.tier_level].free = tier;
      }
    });
  }

  // Auto-select current tier
  useEffect(() => {
    if (activeTab === 'battlepass' && battlePass?.season && battlePass.progress) {
       // Assuming 100 XP per level for demo purposes, adjust logic based on your actual level curve if needed.
       // The original required_xp logic can also be used.
       // Let's just find the highest unlocked level or default to 1.
       const highestUnlocked = battlePass.tiers
          .filter(t => battlePass.progress.current_xp >= t.required_xp)
          .sort((a, b) => b.tier_level - a.tier_level)[0];
       setSelectedBpTier(highestUnlocked ? highestUnlocked.tier_level : 1);
    }
  }, [activeTab, battlePass]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, bpRes, purchasersRes] = await Promise.all([
        api.get('/marketplace/store/items'),
        api.get('/marketplace/battlepass/current'),
        api.get('/marketplace/battlepass/purchasers').catch(() => ({ data: [] }))
      ]);
      setStoreItems(itemsRes.data);
      setBattlePass(bpRes.data);
      setBpPurchasers(purchasersRes.data || []);
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
          <div className="flex flex-col h-[75vh] w-full bg-[#111318] rounded-2xl border border-white/5 overflow-hidden relative">
            
            {/* Top Bar */}
            <div className="h-16 bg-[#1a1c23]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20 shrink-0">
               <div className="flex items-center gap-4">
                 <h2 className="text-3xl font-black text-cyan-400 italic tracking-tighter" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.8)' }}>ROYALE PASS</h2>
                 <div className="flex items-center bg-black/40 rounded-full pl-2 pr-4 py-1 border border-white/10 gap-2">
                    <div className="bg-white text-black font-black w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                      {Math.floor(battlePass.progress.current_xp / 100) + 1}
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50 uppercase font-bold tracking-widest leading-none mb-1">Current Level</div>
                      <div className="text-xs font-bold text-white leading-none">{battlePass.progress.current_xp % 100} / 100 XP</div>
                    </div>
                 </div>
               </div>
               
               <div className="flex items-center gap-4">
                 {user?.role === 'admin' ? (
                   <>
                     <button className="bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest py-2 px-6 rounded transition-all flex items-center gap-2">
                       <Edit3 size={14} />
                       Edit
                     </button>
                     <button className="bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest py-2 px-6 rounded shadow-[0_0_15px_rgba(226,37,117,0.4)] transition-all flex items-center gap-2">
                       <Plus size={14} />
                       Create New
                     </button>
                   </>
                 ) : (
                   <>
                     {!battlePass.progress.is_premium_unlocked && (
                       <button 
                         onClick={handleUpgradeBP}
                         disabled={processing}
                         className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black text-xs font-black uppercase tracking-widest py-2 px-6 rounded shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all flex items-center gap-2"
                       >
                         <Unlock size={14} />
                         Upgrade Pass
                       </button>
                     )}
                     <button className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase tracking-widest py-2 px-6 rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
                       Collect All
                     </button>
                   </>
                 )}
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
              
              {/* Background Character (Left Side) */}
              <div className="absolute inset-0 z-0 bg-black">
                <img src="/bp_background_beach.png" alt="BP Background" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/60 to-[#111318] w-full"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#111318]/50 via-transparent to-[#111318]"></div>
              </div>

              {/* Left Spacer / Elite Roster Panel */}
              <div className="hidden md:flex w-1/4 relative z-10 shrink-0 flex-col justify-end p-4">
                 <div className="bg-black/80 backdrop-blur-md border border-yellow-500/50 rounded-xl p-4 h-72 flex flex-col shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:bg-black/90 transition-colors">
                    <h3 className="text-yellow-400 font-black uppercase tracking-widest text-xs mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                       <div className="flex items-center gap-2">
                         <Star className="w-4 h-4" /> Elite Roster
                       </div>
                       <span className="text-[10px] text-white/50">{bpPurchasers.length} Players</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                       {bpPurchasers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <Lock className="w-8 h-8 text-yellow-500 mb-2" />
                            <p className="text-white text-[10px] text-center uppercase">No Elite Members Yet</p>
                          </div>
                       ) : (
                          bpPurchasers.map(p => (
                             <div key={p.user_id} className="flex flex-col bg-white/5 rounded p-2 border border-white/10 hover:border-yellow-500/30 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                   <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center shrink-0 shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                                         <span className="text-[8px] text-black font-black">BP</span>
                                      </div>
                                      <span className="text-xs font-bold text-white truncate max-w-[80px]" title={p.name}>{p.name}</span>
                                   </div>
                                   <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Lv. {p.level}</span>
                                </div>
                                <div className="flex justify-between items-center pl-7">
                                   <span className="text-[9px] text-white/50">Total XP: <span className="text-cyan-400 font-bold">{p.current_xp}</span></span>
                                </div>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>

              {/* Horizontal Reward Track */}
              <div className="flex-1 overflow-x-auto custom-scrollbar flex relative z-10 bg-gradient-to-r from-transparent to-[#111318]/90">
                 
                 {/* Fixed Row Headers (Free / Elite) */}
                 <div className="sticky left-0 flex flex-col shrink-0 w-24 border-r border-white/5 bg-[#111318]/90 backdrop-blur-md z-20">
                    <div className="h-10 border-b border-white/5"></div> {/* Top spacer for level numbers */}
                    
                    {/* Free Row Header */}
                    <div className="flex-1 border-b border-white/5 flex flex-col items-center justify-center p-2">
                       <div className="w-16 h-16 relative flex items-center justify-center group cursor-pointer">
                         <Shield className="w-12 h-12 text-gray-400 opacity-80 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                         <span className="absolute inset-0 flex items-center justify-center text-black font-black text-sm uppercase z-10 pt-1">Free</span>
                       </div>
                    </div>

                    {/* Elite Row Header */}
                    <div className="flex-1 flex flex-col items-center justify-center p-2 bg-yellow-500/5">
                       <div className="w-16 h-16 relative flex items-center justify-center group cursor-pointer">
                         <Shield className="w-12 h-12 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all group-hover:scale-105" fill="currentColor" />
                         <span className="absolute inset-0 flex items-center justify-center text-black font-black text-[10px] uppercase z-10 pt-1">Elite</span>
                       </div>
                       {!battlePass.progress.is_premium_unlocked && (
                          <div className="mt-2 bg-black/80 rounded px-2 py-1 flex items-center gap-1 border border-white/10">
                            <Lock className="w-3 h-3 text-yellow-500" />
                          </div>
                       )}
                    </div>
                 </div>

                 {/* The Scrollable Tiers */}
                 <div className="flex">
                    {bpLevels.map(level => {
                      const tierData = groupedTiers[level];
                      const requiredXp = (tierData.free || tierData.premium)?.required_xp || level * 100;
                      const isUnlocked = battlePass.progress.current_xp >= requiredXp;
                      const isSelected = selectedBpTier === level;

                      const renderRewardBox = (tier, isPremiumRow) => {
                         if (!tier) return <div className="w-full h-full bg-black/20 flex items-center justify-center"><div className="w-8 h-px bg-white/5"></div></div>;
                         
                         const canClaim = isUnlocked && (!tier.is_premium || battlePass.progress.is_premium_unlocked);
                         
                         return (
                           <div className={`w-full h-full relative border flex flex-col items-center justify-center p-2 transition-colors
                             ${isSelected ? (isPremiumRow ? 'bg-yellow-500/20 border-yellow-500' : 'bg-cyan-500/20 border-cyan-500') : 'bg-black/40 border-white/5 hover:bg-white/5'}
                             ${canClaim ? 'opacity-100' : 'opacity-50'}
                           `}>
                              {/* Item icon placeholder based on name length/type */}
                              <div className={`w-14 h-14 rounded bg-gradient-to-br flex items-center justify-center mb-2 shrink-0 shadow-lg border border-white/10
                                 ${isPremiumRow ? 'from-yellow-900 to-black' : 'from-gray-800 to-black'}
                              `}>
                                 <ShoppingBag className={`w-6 h-6 ${isPremiumRow ? 'text-yellow-500' : 'text-gray-400'}`} />
                              </div>
                              <p className={`text-[9px] font-bold text-center leading-tight line-clamp-2 px-1
                                ${isPremiumRow ? 'text-yellow-400' : 'text-white/80'}
                              `}>
                                {tier.reward_name}
                              </p>
                              
                              {/* Overlay Icons */}
                              {isUnlocked && canClaim && (
                                <div className="absolute top-1 right-1 bg-green-500 rounded-full text-white">
                                  <CheckCircle className="w-3 h-3" />
                                </div>
                              )}
                              {!canClaim && tier.is_premium && !battlePass.progress.is_premium_unlocked && (
                                <div className="absolute top-1 right-1 bg-black/80 rounded-full p-0.5 border border-white/20">
                                  <Lock className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                           </div>
                         );
                      };

                      return (
                        <div 
                          key={level} 
                          className={`flex flex-col shrink-0 w-32 border-r border-white/5 transition-colors cursor-pointer hover:bg-white/5
                            ${isSelected ? 'bg-white/10' : ''}
                          `}
                          onClick={() => setSelectedBpTier(level)}
                        >
                           {/* Level Indicator Header */}
                           <div className={`h-10 flex items-center justify-center border-b font-black text-sm
                             ${isSelected ? 'bg-white text-black border-white' : 'bg-[#15171e] text-white/50 border-white/5'}
                           `}>
                             {level}
                           </div>

                           {/* Free Reward Cell */}
                           <div className={`flex-1 border-b p-2 ${isSelected ? 'border-cyan-500/50' : 'border-white/5'}`}>
                              {renderRewardBox(tierData.free, false)}
                           </div>

                           {/* Elite Reward Cell */}
                           <div className="flex-1 p-2 bg-yellow-500/5">
                              {renderRewardBox(tierData.premium, true)}
                           </div>
                        </div>
                      );
                    })}
                 </div>

                 {/* Spacer at the end of scroll */}
                 <div className="w-12 shrink-0"></div>
              </div>
              
              {/* Right Side Preview Panel */}
              <div className="w-80 bg-[#15171e]/95 backdrop-blur-xl border-l border-white/5 flex flex-col relative z-20 shrink-0">
                 {(() => {
                    const activeTierData = groupedTiers[selectedBpTier];
                    if (!activeTierData) return null;
                    
                    // Show premium reward if available, otherwise free.
                    const displayTier = activeTierData.premium || activeTierData.free;
                    const requiredXp = displayTier?.required_xp || selectedBpTier * 100;
                    const isUnlocked = battlePass.progress.current_xp >= requiredXp;
                    const isPremium = displayTier?.is_premium;
                    const canClaim = isUnlocked && (!isPremium || battlePass.progress.is_premium_unlocked);

                    return (
                      <>
                        <div className="h-16 flex items-center justify-center border-b border-white/5 shrink-0">
                          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Level Reward Preview</p>
                        </div>
                        
                        <div className="flex-1 p-6 flex flex-col">
                           {/* Large Item Preview Box */}
                           <div className="w-full aspect-square bg-gradient-to-br from-gray-900 to-black rounded-xl border border-white/10 mb-6 flex items-center justify-center relative overflow-hidden group shadow-2xl">
                              {/* Background glow based on rarity/premium */}
                              <div className={`absolute inset-0 opacity-20 blur-xl ${isPremium ? 'bg-yellow-500' : 'bg-cyan-500'}`}></div>
                              
                              <img src="/weapon-placeholder.png" alt="Item Preview" className="w-4/5 h-4/5 object-contain filter drop-shadow-2xl opacity-50 group-hover:scale-110 transition-transform duration-700" 
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 hidden items-center justify-center">
                                 <ShoppingBag className={`w-24 h-24 ${isPremium ? 'text-yellow-500/50' : 'text-gray-500/50'}`} />
                              </div>

                              {isPremium && (
                                <div className="absolute top-3 left-3 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-lg">
                                  Elite
                                </div>
                              )}
                           </div>
                           
                           {/* Item Details */}
                           <div className="text-center mb-8">
                             <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isPremium ? 'text-yellow-400' : 'text-white'}`}>
                               {displayTier?.reward_name || 'Mystery Reward'}
                             </h3>
                             <p className="text-xs text-white/50 uppercase tracking-widest">Unlocks at Level {selectedBpTier}</p>
                             <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Required XP: {requiredXp}</p>
                           </div>

                           <div className="mt-auto">
                              {canClaim ? (
                                <button className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg transition-all
                                  ${isPremium 
                                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                                  }
                                `}>
                                  Claim Reward
                                </button>
                              ) : (
                                <button disabled className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm bg-white/5 text-white/30 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2">
                                  <Lock className="w-4 h-4" /> 
                                  {isUnlocked && isPremium && !battlePass.progress.is_premium_unlocked ? 'Upgrade to Claim' : 'Locked'}
                                </button>
                              )}
                           </div>
                        </div>
                      </>
                    );
                 })()}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
