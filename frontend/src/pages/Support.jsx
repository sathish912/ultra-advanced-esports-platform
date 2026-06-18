import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { motion } from 'framer-motion';
import { ShieldAlert, Send, Clock, CheckCircle, Bug, HelpCircle, MessageSquare, Terminal } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'Bug Report',
    description: ''
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/support/tickets/my');
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadToast = toast.loading("Encrypting and transmitting report...");
    try {
      await api.post('/support/tickets', newTicket);
      toast.dismiss(loadToast);
      toast.success("Transmission successful. Support staff alerted.");
      setShowForm(false);
      setNewTicket({ subject: '', category: 'Bug Report', description: '' });
      fetchTickets();
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error(err.response?.data?.detail || "Transmission failed.");
    }
  };

  if (!user) return <div className="text-center p-8 text-white">Access Denied. Identity Verification Required.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="glass-panel-neon p-8 rounded-2xl border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <h1 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
          <ShieldAlert className="text-primary" size={36} />
          Bug Bounty & Support Desk
        </h1>
        <p className="text-textMuted max-w-2xl text-sm leading-relaxed">
          Welcome to the Operative Support Hub. Report platform anomalies, dispute unfair combat results, or request tactical assistance. High-impact bug reports may be rewarded with <span className="text-accent font-bold">Bounty Tokens</span> directly to your wallet!
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Your Transmissions</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary py-2 px-6 flex items-center gap-2 font-bold"
        >
          {showForm ? 'Cancel Transmission' : <><Send size={16} /> New Report</>}
        </button>
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-panel p-6 rounded-2xl border border-primary/30 bg-surface/40"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-1">Incident Subject</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Wall glitch in Sector 7"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-1">Classification</label>
                <select 
                  className="input-field bg-background cursor-pointer"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                >
                  <option value="Bug Report">Bug Report (Bounty Eligible)</option>
                  <option value="Match Dispute">Match Dispute</option>
                  <option value="General Support">General Support</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-1">Incident Details</label>
              <textarea 
                required 
                className="input-field min-h-[120px]" 
                placeholder="Provide detailed logs or steps to reproduce the anomaly..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary py-2 px-8 flex items-center gap-2">
                <Terminal size={16} /> Transmit
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-textMuted border border-dashed border-white/10 rounded-2xl font-semibold">
            No active support transmissions found.
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-surface/20 hover:border-primary/20 transition-colors">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {ticket.category === 'Bug Report' ? <Bug size={16} className="text-accent" /> : 
                     ticket.category === 'Match Dispute' ? <ShieldAlert size={16} className="text-danger" /> :
                     <HelpCircle size={16} className="text-primary" />}
                    <span className="text-xs font-bold text-textMuted uppercase">{ticket.category}</span>
                    <span className="text-xs text-white/30">•</span>
                    <span className="text-xs text-textMuted font-mono">#{String(ticket.id).padStart(5, '0')}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{ticket.subject}</h3>
                  <p className="text-sm text-textMuted mt-2 line-clamp-2">{ticket.description}</p>
                </div>
                
                <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 border ${
                    ticket.status === 'Open' ? 'bg-warning/10 text-warning border-warning/20' :
                    ticket.status === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' :
                    'bg-neonGreen/10 text-neonGreen border-neonGreen/20'
                  }`}>
                    {ticket.status === 'Open' ? <Clock size={12} /> : 
                     ticket.status === 'In Progress' ? <Terminal size={12} /> :
                     <CheckCircle size={12} />}
                    {ticket.status}
                  </div>
                  
                  {ticket.bounty_awarded > 0 && (
                    <div className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20">
                      BOUNTY: +₹{ticket.bounty_awarded}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
