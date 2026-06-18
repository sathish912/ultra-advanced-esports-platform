import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import NeonCard from '../components/ui/NeonCard';
import { Users, Search, Shield, FileSignature } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { motion } from 'framer-motion';

export default function Scout() {
  const { user } = useAuth();
  
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contract Modal State
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [contractData, setContractData] = useState({
    salary: 5000,
    duration_months: 12,
    buyout_clause: 10000,
    streaming_rights: 'Team Retains 50%'
  });

  const fetchProspects = async () => {
    try {
      const res = await api.get('/career/scout');
      setProspects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const handleOpenContractModal = (player) => {
    setSelectedPlayer(player);
    setShowContractModal(true);
  };

  const handleSendContract = async (e) => {
    e.preventDefault();
    try {
      await api.post('/career/contract/offer', {
        ...contractData,
        player_id: selectedPlayer.id
      });
      toast.success(`Contract offered to ${selectedPlayer.name}`);
      setShowContractModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send contract offer');
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center">
        <h2 className="text-2xl font-bold text-white uppercase">Authentication Required</h2>
        <p className="text-textMuted">Log in to access the Scouting Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
      <PageHeader
        badge="Team Management"
        title="Scout Network"
        subtitle="Discover high-ranking free agents and send professional contract offers."
      />

      <NeonCard accent="primary" className="p-6">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Search className="text-primary w-5 h-5" /> Free Agents Pool
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-10 text-primary animate-pulse">Scanning network for prospects...</div>
        ) : prospects.length === 0 ? (
          <div className="text-center py-10 text-textMuted bg-surface rounded-xl border border-white/5">
            <Users className="mx-auto w-12 h-12 mb-2 opacity-50" />
            <p>No active free agents found at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prospects.map(p => (
              <div key={p.id} className="bg-surface border border-white/10 hover:border-primary/50 transition-colors p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-void flex items-center justify-center font-bold text-white border border-primary/20 overflow-hidden">
                      {p.avatar ? <img src={p.avatar} alt="avatar" className="w-full h-full object-cover" /> : p.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{p.name}</p>
                      <p className="text-xs text-textMuted uppercase font-bold tracking-wider">MMR: {p.mmr} | {p.tier}</p>
                    </div>
                  </div>
                  {p.is_verified_pro && (
                    <span className="inline-block bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-3 shadow-[0_0_10px_rgba(0,245,255,0.2)]">
                      Verified Pro
                    </span>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 bg-background p-2 rounded mb-4">
                    <p>Wins: <span className="text-white font-bold">{p.wins}</span></p>
                    <p>Kills: <span className="text-white font-bold">{p.kills}</span></p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleOpenContractModal(p)}
                  className="w-full py-2 flex justify-center items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold uppercase text-xs rounded transition-colors"
                >
                  <FileSignature size={14} /> Send Contract Offer
                </button>
              </div>
            ))}
          </div>
        )}
      </NeonCard>

      {/* Contract Offer Modal */}
      {showContractModal && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-primary/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-primary/10"
          >
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileSignature className="text-primary" /> Offer Contract
              </h2>
            </div>
            
            <p className="text-sm text-textMuted mb-6">
              Drafting a contract for <span className="text-white font-bold">{selectedPlayer.name}</span>.
            </p>

            <form onSubmit={handleSendContract} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-1">Monthly Salary (₹)</label>
                <input 
                  type="number"
                  className="input-field w-full"
                  value={contractData.salary}
                  onChange={e => setContractData({...contractData, salary: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase mb-1">Duration (Months)</label>
                  <input 
                    type="number"
                    className="input-field w-full"
                    value={contractData.duration_months}
                    onChange={e => setContractData({...contractData, duration_months: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase mb-1">Buyout Clause (₹)</label>
                  <input 
                    type="number"
                    className="input-field w-full"
                    value={contractData.buyout_clause}
                    onChange={e => setContractData({...contractData, buyout_clause: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-1">Streaming Rights</label>
                <input 
                  type="text"
                  className="input-field w-full"
                  value={contractData.streaming_rights}
                  onChange={e => setContractData({...contractData, streaming_rights: e.target.value})}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowContractModal(false)}
                  className="flex-1 py-3 bg-background hover:bg-white/5 text-white rounded-xl font-bold uppercase text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold uppercase text-sm transition-colors"
                >
                  Send Offer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
