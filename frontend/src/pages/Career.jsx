import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import NeonCard from '../components/ui/NeonCard';
import { Briefcase, Shield, FileText, CheckCircle, Edit3, X, Save, FileSignature, Search, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../api';

export default function Career() {
  const { user, setUser } = useAuth();
  
  const [portfolio, setPortfolio] = useState(null);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [squads, setSquads] = useState([]);
  
  // Admin States
  const [adminPortfolios, setAdminPortfolios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    preferred_roles: '',
    past_teams: '',
    hardware_specs: '',
    looking_for_team: true
  });
  const [loading, setLoading] = useState(true);

  const fetchCareerData = async () => {
    if (!user) return;
    try {
      if (user.role === 'admin') {
        const adminRes = await api.get('/career/admin/portfolios');
        setAdminPortfolios(adminRes.data);
      } else {
        try {
          const portRes = await api.get(`/career/portfolio/${user.id}`);
          setPortfolio(portRes.data);
          setFormData({
            bio: portRes.data.bio || '',
            preferred_roles: portRes.data.preferred_roles || '',
            past_teams: portRes.data.past_teams || '',
            hardware_specs: portRes.data.hardware_specs || '',
            looking_for_team: portRes.data.looking_for_team
          });
        } catch (e) {
          if (e.response?.status === 404) setPortfolio(null);
        }

        const appsRes = await api.get('/career/applications');
        setApplications(appsRes.data);

        const squadsRes = await api.get('/career/my-squads');
        setSquads(squadsRes.data);

        const contractsRes = await api.get('/career/contracts/my-offers');
        setContracts(contractsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareerData();
  }, [user]);

  const handleSavePortfolio = async (e) => {
    e.preventDefault();
    try {
      if (portfolio) {
        await api.put('/career/portfolio', formData);
        toast.success('Portfolio updated!');
      } else {
        await api.post('/career/portfolio', formData);
        toast.success('Portfolio created!');
      }
      setIsEditing(false);
      fetchCareerData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save portfolio');
    }
  };

  const handleAcceptContract = async (contractId) => {
    try {
      await api.post(`/career/contract/${contractId}/accept`);
      toast.success('Contract signed! Welcome to the team.');
      fetchCareerData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept contract');
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center">
        <h2 className="text-2xl font-bold text-white uppercase">Authentication Required</h2>
        <p className="text-textMuted">Log in to view your career profile.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-10 text-primary animate-pulse">Loading Career Profile...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <PageHeader
        badge={user.role === 'admin' ? "Admin Dashboard" : "Pro Dashboard"}
        title={user.role === 'admin' ? "Global Portfolio Directory" : "eSports Career System"}
        subtitle={user.role === 'admin' ? "Search and view professional player portfolios across the network." : "Manage your professional portfolio, team applications, and digital contracts."}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Portfolio (Admin Directory or Player Editor) */}
        <div className="lg:col-span-2 space-y-6">
          {user.role === 'admin' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NeonCard accent="cyan" className="p-4 flex flex-col h-[500px]">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search player name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {adminPortfolios.filter(p => p.user_name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPortfolio(p)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedPortfolio?.id === p.id 
                            ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(0,245,255,0.2)]' 
                            : 'bg-surface border-white/5 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {p.user_avatar ? (
                              <img src={p.user_avatar} alt={p.user_name} className="w-8 h-8 rounded-full border border-primary/30" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <span className="text-primary font-bold text-xs">{p.user_name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-white uppercase">{p.user_name}</p>
                              <p className="text-[10px] text-textMuted uppercase flex items-center gap-1">
                                MMR: {p.user_mmr} 
                                {p.is_verified_pro && <CheckCircle size={10} className="text-primary" />}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className={selectedPortfolio?.id === p.id ? 'text-primary' : 'text-gray-500'} />
                        </div>
                      </button>
                    ))}
                    {adminPortfolios.filter(p => p.user_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <p className="text-center text-sm text-textMuted mt-10">No portfolios found.</p>
                    )}
                  </div>
                </NeonCard>

                <NeonCard accent="magenta" className="p-4 h-[500px] overflow-y-auto custom-scrollbar">
                  {selectedPortfolio ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                        {selectedPortfolio.user_avatar ? (
                          <img src={selectedPortfolio.user_avatar} alt={selectedPortfolio.user_name} className="w-12 h-12 rounded-full border border-primary/50" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                            <span className="text-primary font-bold text-xl">{selectedPortfolio.user_name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <h2 className="text-lg font-display font-bold text-white uppercase tracking-widest">{selectedPortfolio.user_name}</h2>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${selectedPortfolio.looking_for_team ? 'bg-neonGreen/20 text-neonGreen border border-neonGreen/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                              {selectedPortfolio.looking_for_team ? 'LFT' : 'Signed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Biography</h4>
                        <p className="text-white/80 text-xs bg-surface p-3 rounded-xl border border-white/5">
                          {selectedPortfolio.bio || <span className="italic text-textMuted">No biography provided.</span>}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface p-3 rounded-xl border border-white/5">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Roles</h4>
                          <p className="text-white font-bold text-xs">{selectedPortfolio.preferred_roles || 'N/A'}</p>
                        </div>
                        <div className="bg-surface p-3 rounded-xl border border-white/5">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hardware</h4>
                          <p className="text-white font-bold text-xs">{selectedPortfolio.hardware_specs || 'N/A'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Past Teams</h4>
                        <p className="text-white text-xs bg-surface p-3 rounded-xl font-bold border border-white/5">
                          {selectedPortfolio.past_teams || 'No previous team history.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                      <FileText className="w-12 h-12 text-primary mb-4" />
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider">Select Portfolio</h3>
                      <p className="text-xs text-textMuted mt-2">Click on a player to view details.</p>
                    </div>
                  )}
                </NeonCard>
              </div>
            </div>
          ) : (
            <NeonCard accent="cyan" className="p-6">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="text-primary w-5 h-5" /> Player Portfolio
              </h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase text-primary hover:text-white transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 text-xs font-bold uppercase text-red-500 hover:text-white transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSavePortfolio} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase mb-1">Player Bio</label>
                  <textarea 
                    className="input-field w-full h-24 resize-none"
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell teams about yourself..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">Preferred Roles</label>
                    <input 
                      className="input-field w-full"
                      value={formData.preferred_roles}
                      onChange={e => setFormData({...formData, preferred_roles: e.target.value})}
                      placeholder="e.g. IGL, Entry Fragger, Sniper"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase mb-1">Hardware Specs</label>
                    <input 
                      className="input-field w-full"
                      value={formData.hardware_specs}
                      onChange={e => setFormData({...formData, hardware_specs: e.target.value})}
                      placeholder="e.g. RTX 4090, 240Hz Monitor"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase mb-1">Past Teams</label>
                  <input 
                    className="input-field w-full"
                    value={formData.past_teams}
                    onChange={e => setFormData({...formData, past_teams: e.target.value})}
                    placeholder="List previous professional teams..."
                  />
                </div>
                <div className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="lft"
                    checked={formData.looking_for_team}
                    onChange={e => setFormData({...formData, looking_for_team: e.target.checked})}
                    className="w-4 h-4 rounded bg-background border-primary/50 text-primary focus:ring-primary focus:ring-offset-background"
                  />
                  <label htmlFor="lft" className="text-sm font-bold text-white uppercase cursor-pointer">Looking for Team (LFT)</label>
                </div>
                
                <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                  <Save size={18} /> Save Portfolio
                </button>
              </form>
            ) : portfolio ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${portfolio.looking_for_team ? 'bg-neonGreen animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="font-bold text-sm uppercase text-white">
                      Status: <span className={portfolio.looking_for_team ? 'text-neonGreen' : 'text-red-500'}>
                        {portfolio.looking_for_team ? 'Looking for Team' : 'Signed / Not Looking'}
                      </span>
                    </span>
                  </div>
                  {user.is_verified_pro && (
                    <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(0,245,255,0.2)]">
                      <CheckCircle size={14} /> Verified Pro
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Biography</h4>
                  <p className="text-white/80 text-sm bg-white/5 p-4 rounded-xl leading-relaxed">
                    {portfolio.bio || <span className="italic text-textMuted">No biography provided.</span>}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-surface p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Roles</h4>
                    <p className="text-white font-bold">{portfolio.preferred_roles || 'N/A'}</p>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hardware Specs</h4>
                    <p className="text-white font-bold">{portfolio.hardware_specs || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Past Teams</h4>
                  <p className="text-white text-sm bg-surface p-4 rounded-xl font-bold border border-white/5">
                    {portfolio.past_teams || 'No previous team history.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <FileText className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white uppercase mb-2">No Portfolio Found</h4>
                <p className="text-sm text-textMuted mb-6">Create your career portfolio to get scouted by professional teams.</p>
                <button onClick={() => setIsEditing(true)} className="btn-primary px-6 py-2">Create Portfolio</button>
              </div>
            )}
          </NeonCard>
          )}
        </div>

        {/* Right Col: Applications & Contracts */}
        {user.role !== 'admin' && (
        <div className="lg:col-span-1 space-y-6">
          <NeonCard accent="neonGold" className="p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
              <FileSignature className="text-neonGold w-5 h-5" /> Digital Contracts
            </h3>
            
            {contracts.length === 0 ? (
              <p className="text-xs text-textMuted text-center py-4 bg-surface rounded-xl border border-white/5">No contract offers currently.</p>
            ) : (
              <div className="space-y-4">
                {contracts.map(contract => (
                  <div key={contract.id} className="bg-surface border border-neonGold/30 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Offer from Team ID: {contract.team_id}</p>
                        <p className="text-lg font-display font-bold text-neonGold mt-1">₹{contract.salary}/mo</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${contract.status === 'Signed' ? 'bg-neonGreen/20 text-neonGreen border border-neonGreen/30' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'}`}>
                        {contract.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-white/80 space-y-1 mb-4 bg-background p-3 rounded border border-white/5">
                      <p><span className="text-textMuted uppercase font-bold mr-2">Duration:</span> {contract.duration_months} Months</p>
                      <p><span className="text-textMuted uppercase font-bold mr-2">Buyout:</span> ₹{contract.buyout_clause}</p>
                      <p><span className="text-textMuted uppercase font-bold mr-2">Rights:</span> {contract.streaming_rights || 'None'}</p>
                    </div>

                    {contract.status === 'Offered' && (
                      <button 
                        onClick={() => handleAcceptContract(contract.id)}
                        className="w-full py-2 bg-neonGold hover:bg-yellow-400 text-black font-bold uppercase text-xs rounded transition-colors shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                      >
                        Sign Contract
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </NeonCard>

          <NeonCard accent="magenta" className="p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
              <Shield className="text-secondary w-5 h-5" /> Active Squads
            </h3>
            
            {squads.length === 0 ? (
              <p className="text-xs text-textMuted text-center py-4 bg-surface rounded-xl border border-white/5">You haven't joined any squads.</p>
            ) : (
              <div className="space-y-3">
                {squads.map((squad, idx) => (
                  <div key={idx} className="bg-surface border border-white/10 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white uppercase">{squad.name}</p>
                      <p className="text-[10px] text-textMuted uppercase">{squad.type} • {squad.role}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-neonGreen/20 text-neonGreen">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </NeonCard>
        </div>
        )}
      </div>
    </div>
  );
}
