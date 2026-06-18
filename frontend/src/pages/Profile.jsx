import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, MapPin, Wallet, Crown, Shield, CreditCard, ArrowDownToLine, ArrowUpFromLine, Send, Trophy, Edit3, Calendar, Phone, Globe, Languages, Settings } from 'lucide-react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [financeStats, setFinanceStats] = useState(null);
  const [recentWinners, setRecentWinners] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutModalUpi, setPayoutModalUpi] = useState('');
  const [transactions, setTransactions] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [payoutUpiId, setPayoutUpiId] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaQr, setMfaQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    avatar: '',
    country: '',
    date_of_birth: '',
    mobile_no: '',
    language: ''
  });

  const [profileUser, setProfileUser] = useState(user);

  const avatars = [
    'http://localhost:8000/static/avatars/avatar1.png', 'http://localhost:8000/static/avatars/avatar2.png', 'http://localhost:8000/static/avatars/avatar3.png',
    'http://localhost:8000/static/avatars/4.jpg', 'http://localhost:8000/static/avatars/5.jpg', 'http://localhost:8000/static/avatars/6.jpg',
    'http://localhost:8000/static/avatars/7.jpg', 'http://localhost:8000/static/avatars/8.jpg'
  ];

  const verifyDeposit = async (sessionId) => {
    try {
      await api.get(`/wallet/verify-deposit?session_id=${sessionId}`);
      toast.success('Deposit successful! Wallet updated.');
      fetchProfile();
      navigate('/profile', { replace: true });
    } catch (err) {
      toast.error('Deposit verification failed.');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      setProfileUser(res.data);
      setUser(res.data); // Update global user state so NavBar matches Profile
      if (res.data.role === 'admin') {
        const statsRes = await api.get('/admin/finance-stats');
        setFinanceStats(statsRes.data);
        const winnersRes = await api.get('/admin/recent-winners');
        setRecentWinners(winnersRes.data);
      }
      const txRes = await api.get('/wallet/transactions');
      setTransactions(txRes.data);
      setPayoutUpiId(res.data.payout_upi_id || '');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayout = async (e) => {
    e.preventDefault();
    if (!payoutEmail || !payoutAmount || Number(payoutAmount) <= 0) return;
    try {
      const res = await api.post('/admin/payout', { email: payoutEmail, amount: Number(payoutAmount), upi_id: payoutModalUpi || null });
      toast.success(res.data.detail || "Payout processed successfully");
      setShowPayoutModal(false);
      setPayoutEmail('');
      setPayoutAmount('');
      setPayoutModalUpi('');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Payout failed");
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editFormData };
      if (payload.date_of_birth === '') {
        payload.date_of_birth = null;
      }
      
      const res = await api.patch('/profile/edit', payload);
      setProfileUser(res.data);
      setUser(res.data);
      toast.success('Profile updated successfully!');
      setShowEditModal(false);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        toast.error(`Validation error: ${detail[0].loc?.slice(-1)[0]} - ${detail[0].msg}`);
      } else {
        toast.error('Failed to update profile');
      }
    }
  };

  const setupMfa = async () => {
    try {
      const res = await api.post('/auth/mfa/setup');
      setMfaQr(res.data.qr_code);
      setMfaSecret(res.data.secret);
      setShowMfaModal(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to setup MFA");
    }
  };

  const verifyMfaSetup = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/mfa/verify-setup', { token: mfaVerifyCode });
      toast.success("MFA Enabled Successfully!");
      setShowMfaModal(false);
      setMfaVerifyCode('');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
    }
  };

  const disableMfa = async () => {
    const code = prompt("Enter your current MFA code to disable:");
    if (!code) return;
    try {
      await api.post('/auth/mfa/disable', { token: code });
      toast.success("MFA Disabled");
      fetchProfile();
    } catch (err) {
      toast.error("Failed to disable MFA. Invalid code.");
    }
  };

  const openEditModal = () => {
    setEditFormData({
      name: profileUser.name || '',
      avatar: profileUser.avatar || '',
      country: profileUser.country || '',
      date_of_birth: profileUser.date_of_birth || '',
      mobile_no: profileUser.mobile_no || '',
      language: profileUser.language || 'English'
    });
    setShowEditModal(true);
  };

  useEffect(() => {
    fetchProfile();
    const query = new URLSearchParams(location.search);
    const sessionId = query.get('session_id');
    const depositSuccess = query.get('deposit_success');
    
    if (sessionId && depositSuccess) {
      verifyDeposit(sessionId);
    }
  }, [location.search]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) < 500) {
      toast.error("Minimum deposit is ₹500");
      return;
    }
    try {
      const res = await api.post('/wallet/deposit', { amount: Number(depositAmount) });
      if (res.data.order_id) {
          const options = {
              "key": res.data.key_id,
              "amount": res.data.amount,
              "currency": res.data.currency,
              "name": "ULTRA ESPORTS",
              "description": "Wallet Deposit",
              "order_id": res.data.order_id,
              "handler": async function (response) {
                  let verifyToast = toast.loading('Verifying deposit...');
                  try {
                      await api.post('/wallet/verify-deposit', {
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_signature: response.razorpay_signature
                      });
                      toast.success('Deposit successful! Wallet updated.', { id: verifyToast });
                      setShowDepositModal(false);
                      setDepositAmount('');
                      fetchProfile();
                  } catch (err) {
                      toast.error('Deposit verification failed', { id: verifyToast });
                  }
              },
              "theme": {
                  "color": "#eab308"
              }
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
              toast.error(response.error.description);
          });
          rzp.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Deposit failed");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (Number(withdrawAmount) > profileUser?.wallet_balance) {
      toast.error("Insufficient funds in wallet");
      return;
    }
    try {
      await api.post('/wallet/withdraw', { amount: Number(withdrawAmount) });
      toast.success(`Successfully withdrew ₹${withdrawAmount}`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Withdrawal failed");
    }
  };

  const handleUpiConnect = async () => {
    const upi = window.prompt("Enter your Payout UPI ID (e.g. name@okhdfcbank):", payoutUpiId || "");
    if (upi !== null && upi.trim() !== "") {
        try {
            await api.patch('/profile/payout-upi', { payout_upi_id: upi.trim() });
            toast.success("UPI ID updated successfully!");
            fetchProfile();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to update UPI ID");
        }
    }
  };

  if (!profileUser) return <div className="p-12 text-center text-textMuted">Loading profile...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <UserIcon size={40} className="text-primary" />
        <div>
          <h1 className="text-4xl font-display font-bold text-white tracking-wider uppercase">Operative Profile</h1>
          <p className="text-textMuted uppercase text-sm tracking-widest mt-1">Manage your identity and assets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 glass-panel rounded-2xl p-8 border border-white/10 relative overflow-hidden flex flex-col items-center"
        >
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent"></div>
          
          <div className="relative z-10 w-32 h-32 rounded-full border-4 border-surface shadow-2xl mb-6 bg-background flex items-center justify-center overflow-hidden">
            {profileUser.avatar ? (
              <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={64} className="text-textMuted" />
            )}
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{profileUser.name}</h2>
            <button 
              onClick={openEditModal}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/5"
              title="Edit Profile"
            >
              <Edit3 size={16} />
            </button>
          </div>
          
          <div className="flex gap-2 mb-8">
            {profileUser.role === 'admin' ? (
              <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <Shield size={14} /> Admin
              </span>
            ) : profileUser.is_premium ? (
              <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <Crown size={14} /> Premium
              </span>
            ) : (
              <span className="bg-secondary/20 text-secondary border border-secondary/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Shield size={14} /> Free Plan
              </span>
            )}
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-white/5">
              <Mail className="text-textMuted" size={18} />
              <div className="flex-1 overflow-hidden text-ellipsis">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Email Address</p>
                <p className="text-white text-sm">{profileUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-white/5">
              <MapPin className="text-textMuted" size={18} />
              <div>
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Region</p>
                <p className="text-white text-sm">{profileUser.country || 'Not Set'}</p>
              </div>
            </div>
            
            {(profileUser.date_of_birth || profileUser.mobile_no || profileUser.language) && (
              <>
                {profileUser.date_of_birth && (
                  <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-white/5">
                    <Calendar className="text-textMuted" size={18} />
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Date of Birth</p>
                      <p className="text-white text-sm">{profileUser.date_of_birth}</p>
                    </div>
                  </div>
                )}
                {profileUser.mobile_no && (
                  <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-white/5">
                    <Phone className="text-textMuted" size={18} />
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Mobile Number</p>
                      <p className="text-white text-sm">{profileUser.mobile_no}</p>
                    </div>
                  </div>
                )}
                {profileUser.language && (
                  <div className="flex items-center gap-3 bg-background/50 p-3 rounded-xl border border-white/5">
                    <Languages className="text-textMuted" size={18} />
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Language</p>
                      <p className="text-white text-sm">{profileUser.language}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="flex flex-col gap-3 bg-background/50 p-4 rounded-xl border border-white/5 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-purple-400" size={18} />
                  <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Payout Account</p>
                    <p className="text-white text-sm font-semibold truncate max-w-[200px]">
                      {payoutUpiId ? `${payoutUpiId}` : "Not Connected"}
                    </p>
                  </div>
                </div>
                {payoutUpiId ? (
                  <button 
                    onClick={handleUpiConnect}
                    className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md uppercase tracking-wider hover:bg-amber-400/20 transition-colors"
                  >
                    Edit UPI
                  </button>
                ) : (
                  <button 
                    onClick={handleUpiConnect}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    Add UPI ID
                  </button>
                )}
              </div>
            </div>
            
          </div>
        </motion.div>

        {/* Wallet & Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Wallet Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel rounded-2xl p-8 border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Wallet className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">ULTRA ESPORTS Wallet</h3>
                  <p className="text-xs text-textMuted tracking-wider uppercase">Available Balance</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-4xl font-display font-bold text-primary tracking-wider">
                  ₹{profileUser.wallet_balance?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <button 
                onClick={() => setShowDepositModal(true)}
                className="flex-1 py-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap min-w-[150px]"
              >
                <ArrowDownToLine size={18} /> Deposit Funds
              </button>
              <button 
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1 py-3 bg-surface hover:bg-white/5 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap min-w-[150px]"
              >
                <ArrowUpFromLine size={18} /> Withdraw
              </button>
              {profileUser.role === 'admin' && (
                <button 
                  onClick={() => setShowPayoutModal(true)}
                  className="flex-1 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap min-w-[150px]"
                >
                  <Send size={18} /> Send Payout
                </button>
              )}
            </div>
          </motion.div>

          {/* Transactions Ledger */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-2xl p-8 border border-white/10"
          >
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Financial Ledger</h3>
            <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {transactions.length === 0 ? (
                <p className="text-textMuted text-sm text-center py-4">No transaction history found.</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-surface/50 border border-white/5 rounded-xl">
                    <div>
                      <p className="text-white text-sm font-bold uppercase">{tx.transaction_type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-textMuted uppercase tracking-wider">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${tx.amount > 0 ? 'text-primary' : 'text-danger'}`}>
                        {tx.amount > 0 ? '+' : ''}₹{tx.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-textMuted uppercase tracking-wider">
                        {tx.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {profileUser.role === 'admin' && financeStats ? (
            <>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="glass-panel p-6 rounded-xl border border-purple-500/30 text-center">
                  <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Superchat Revenue</p>
                  <p className="text-2xl font-bold text-purple-400">₹{financeStats.superchat_revenue.toFixed(2)}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl border border-yellow-500/30 text-center">
                  <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Premium Revenue</p>
                  <p className="text-2xl font-bold text-yellow-500">₹{financeStats.premium_revenue.toFixed(2)}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl border border-primary/30 text-center">
                  <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Registration Fees</p>
                  <p className="text-2xl font-bold text-primary">₹{financeStats.registration_revenue.toFixed(2)}</p>
                </div>
              </motion.div>
              
              {recentWinners.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} /> Recent Winners
                  </h3>
                  <div className="space-y-3">
                    {recentWinners.map((winner, idx) => (
                      <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{winner.winner_name}</p>
                          <p className="text-[10px] text-textMuted uppercase tracking-wider">{winner.tournament_name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-bold text-primary">Prize: ₹{winner.prize}</p>
                          <button 
                            onClick={() => {
                              setPayoutEmail(winner.winner_email);
                              setPayoutAmount(winner.prize);
                              setPayoutModalUpi(winner.winner_upi || '');
                              setShowPayoutModal(true);
                            }}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer"
                          >
                            Payout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Global Rank</p>
                <p className="text-2xl font-bold text-white">{profileUser.rank ? '#' + profileUser.rank : 'N/A'}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-primary">₹{profileUser.total_earnings?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">MVP Awards</p>
                <p className="text-2xl font-bold text-white">{profileUser.mvps || 0}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Total Wins</p>
                <p className="text-2xl font-bold text-white">{profileUser.wins || 0}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Total Kills</p>
                <p className="text-2xl font-bold text-white">{profileUser.kills || 0}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mb-1">Best Kill</p>
                <p className="text-2xl font-bold text-white">{profileUser.best_kill || 0}</p>
              </div>
            </motion.div>
          )}

          {/* Security Settings */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-2xl p-8 border border-white/10 mt-8"
          >
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Shield className="text-primary" size={20} /> Security Settings
            </h3>
            <div className="flex items-center justify-between p-4 bg-surface/50 border border-white/5 rounded-xl">
              <div>
                <p className="text-white text-sm font-bold uppercase">Two-Factor Authentication (MFA)</p>
                <p className="text-[10px] text-textMuted uppercase tracking-wider">
                  Secure your account using a TOTP authenticator app.
                </p>
              </div>
              <div>
                {profileUser.mfa_enabled ? (
                  <button onClick={disableMfa} className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 px-4 py-2 rounded uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer">
                    Disable MFA
                  </button>
                ) : (
                  <button onClick={setupMfa} className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer">
                    Enable MFA
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <CreditCard className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Deposit Funds</h2>
              </div>
              <form onSubmit={handleDeposit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Amount (INR ₹)</label>
                  <input
                    type="number"
                    min="500"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="input-field w-full"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 py-3 bg-background hover:bg-white/5 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 btn-primary text-background rounded-xl font-bold uppercase tracking-wider transition-colors"
                  >
                    Proceed to Pay
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <ArrowUpFromLine className="text-white" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Withdraw Funds</h2>
              </div>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Amount (INR ₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={profileUser.wallet_balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="input-field w-full"
                    required
                  />
                  <p className="text-xs text-textMuted mt-2">Available to withdraw: ₹{profileUser.wallet_balance?.toFixed(2)}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-3 bg-background hover:bg-white/5 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Modal */}
      <AnimatePresence>
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Send className="text-purple-400" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Send Payout</h2>
              </div>
              <form onSubmit={handlePayout} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Player Email</label>
                  <input
                    type="email"
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                    placeholder="player@example.com"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Amount (INR ₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount to send"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Player UPI ID (Optional)</label>
                  <input
                    type="text"
                    value={payoutModalUpi}
                    onChange={(e) => setPayoutModalUpi(e.target.value)}
                    placeholder="e.g. player@bank"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                  />
                  <p className="text-[10px] text-textMuted mt-2 uppercase tracking-wider">
                    Balance will be deducted from Admin Wallet and transferred to Player Wallet.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
                  >
                    Send Payout
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Settings className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Edit Profile</h2>
              </div>
              <form onSubmit={handleEditProfile} className="space-y-6">
                
                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Select Avatar</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {avatars.map((avatarUrl, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setEditFormData({...editFormData, avatar: avatarUrl})}
                        className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${
                          editFormData.avatar === avatarUrl ? 'border-primary scale-110 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={avatarUrl} alt="Avatar option" className="w-full h-auto aspect-square object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Display Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Date of Birth</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        value={editFormData.date_of_birth}
                        onChange={(e) => setEditFormData({...editFormData, date_of_birth: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={editFormData.mobile_no}
                        onChange={(e) => setEditFormData({...editFormData, mobile_no: e.target.value})}
                        placeholder="+1 234 567 8900"
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Country / Region</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.country}
                        onChange={(e) => setEditFormData({...editFormData, country: e.target.value})}
                        placeholder="e.g. India, USA"
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Language */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Preferred Language</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Languages className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={editFormData.language}
                        onChange={(e) => setEditFormData({...editFormData, language: e.target.value})}
                        placeholder="e.g. English, Hindi, Spanish"
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-slate-950 rounded-xl font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MFA Setup Modal */}
      <AnimatePresence>
        {showMfaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Shield className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Setup 2FA</h2>
              </div>
              <p className="text-sm text-textMuted mb-4">
                Scan this QR code with Google Authenticator, Authy, or your preferred TOTP app.
              </p>
              <div className="flex justify-center mb-6 bg-white p-4 rounded-xl">
                {mfaQr && <img src={mfaQr} alt="MFA QR Code" className="w-48 h-48" />}
              </div>
              <p className="text-center text-[10px] font-mono text-textMuted mb-6 bg-black/50 p-2 rounded">
                Secret: {mfaSecret}
              </p>
              <form onSubmit={verifyMfaSetup} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Verify Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaVerifyCode}
                    onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="input-field w-full text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowMfaModal(false)}
                    className="flex-1 py-3 bg-background hover:bg-white/5 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={mfaVerifyCode.length !== 6}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    Verify & Enable
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
