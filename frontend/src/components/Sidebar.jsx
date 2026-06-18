import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, LogOut, User as UserIcon, Trophy, BarChart2, Tv, Crown, CreditCard, Wallet, X, ChevronRight, Sparkles, LayoutGrid, MessageCircle, ShoppingBag, Menu, Users, Briefcase, ShieldAlert } from 'lucide-react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = user
    ? [
        { to: '/arena', icon: LayoutGrid, label: 'Arena' },
        { to: '/lobby', icon: Users, label: 'Lobby', accent: 'text-emerald-400' },
        { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
        { to: '/esports-tv', icon: Tv, label: 'TV', accent: 'text-red-400' },
        { to: '/leaderboard', icon: BarChart2, label: 'Ranks' },
        { to: '/social', icon: MessageCircle, label: 'Social' },
        { to: '/career', icon: Briefcase, label: 'Career', accent: 'text-indigo-400' },
        { to: '/scout', icon: Users, label: 'Scout', accent: 'text-fuchsia-400' },
        { to: '/fantasy', icon: Sparkles, label: 'Fantasy', accent: 'text-yellow-400' },
        { to: '/marketplace', icon: ShoppingBag, label: 'Store' },
        { to: '/support', icon: ShieldAlert, label: 'Support', accent: 'text-rose-400' },
        { to: '/dashboard', icon: UserIcon, label: 'HQ' },
      ]
    : [
        { to: '/arena', icon: LayoutGrid, label: 'Arena' },
        { to: '/lobby', icon: Users, label: 'Lobby', accent: 'text-emerald-400' },
        { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
        { to: '/leaderboard', icon: BarChart2, label: 'Ranks' },
        { to: '/about', icon: Zap, label: 'About' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const premiumSuccess = query.get('premium_success');
    const sessionId = query.get('session_id');
    
    if (premiumSuccess && sessionId) {
      const verifyPremium = async () => {
        let loadingToast = toast.loading('Verifying your Premium upgrade...');
        try {
          // Keep existing verify premium if they return via redirect (fallback)
          await api.post('/verify-premium-razorpay', { razorpay_payment_id: sessionId });
          const profileRes = await api.get('/profile');
          setUser(profileRes.data);
          toast.success('Successfully upgraded to Premium! Welcome to the club 👑', { id: loadingToast, duration: 6000 });
        } catch (err) {
          toast.error(err.response?.data?.detail || 'Premium upgrade verification failed.', { id: loadingToast });
        } finally {
          navigate('/dashboard', { replace: true });
        }
      };
      verifyPremium();
    }
  }, [navigate, setUser]);

  const handleRazorpayUpgrade = async () => {
    setIsProcessing(true);
    try {
      const res = await api.post('/upgrade-premium-razorpay');
      if (res.data.order_id) {
        const options = {
            "key": res.data.key_id,
            "amount": res.data.amount,
            "currency": res.data.currency,
            "name": "ULTRA ESPORTS",
            "description": "Premium Subscription",
            "order_id": res.data.order_id,
            "handler": async function (response) {
                let verifyToast = toast.loading('Verifying payment...');
                try {
                    await api.post('/verify-premium-razorpay', {
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    const profileRes = await api.get('/profile');
                    setUser(profileRes.data);
                    toast.success('Successfully upgraded to Premium! Welcome to the club 👑', { id: verifyToast, duration: 6000 });
                    setShowUpgradeModal(false);
                } catch (err) {
                    toast.error('Payment verification failed', { id: verifyToast });
                }
            },
            "theme": {
                "color": "#eab308"
            }
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            toast.error(response.error.description);
        });
        rzp1.open();
      } else {
        toast.error('Failed to create Razorpay order.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Razorpay initialization failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletUpgrade = async () => {
    setIsProcessing(true);
    try {
      await api.post('/upgrade-premium');
      const profileRes = await api.get('/profile');
      setUser(profileRes.data);
      toast.success('Successfully upgraded to Premium using Wallet! 👑');
      setShowUpgradeModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Wallet upgrade failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a0f]/95 backdrop-blur-xl border-r border-white/5 relative z-50">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/5">
        <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
          <div className="relative">
            <Zap className="h-10 w-10 text-primary drop-shadow-[0_0_12px_rgba(0,245,255,0.6)]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-black text-xl tracking-[0.2em] text-white">ULTRA</span>
            <span className="font-display font-bold text-xs tracking-[0.35em] text-secondary">ESPORTS</span>
          </div>
        </Link>
      </div>

      {/* Profile Widget (If logged in) */}
      {user && (
        <div className="p-4 border-b border-white/5">
          <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between border border-white/5 hover:border-cyan-500/30 transition-colors">
            <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 flex-1 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-white truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                  {user.name}
                </span>
                <div className="flex mt-1 items-center gap-2">
                  {user.role === 'admin' ? (
                    <span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold border border-red-500/30 shrink-0">Admin</span>
                  ) : user.is_premium ? (
                    <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase font-bold border border-yellow-500/30 shrink-0">Premium</span>
                  ) : (
                    <span className="text-[9px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded uppercase font-bold border border-secondary/30 shrink-0">Free</span>
                  )}
                  <span className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-mono border border-white/20 shrink-0" title="Your unique Player ID">
                    UID: {user.id}
                  </span>
                </div>
              </div>
            </Link>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-bold uppercase text-xs tracking-widest ${
                isActive 
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <link.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''} ${link.accent || 'text-cyan-500'}`} />
              <span className={isActive ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : ''}>{link.label}</span>
            </Link>
          );
        })}

        {!user && (
          <div className="pt-4 border-t border-white/5 flex flex-col gap-3 mt-4">
            <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-ghost w-full text-center">Login</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-center">Create Account</Link>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Area */}
      {user && (
        <div className="p-4 border-t border-white/5 space-y-3 bg-black/20">
          {user.role !== 'admin' && !user.is_premium && (
            <button 
              onClick={() => { setShowUpgradeModal(true); setMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:scale-[1.02] transition-all cursor-pointer border border-yellow-300/30"
            >
              <Crown className="h-4 w-4" />
              <span>Get Premium</span>
            </button>
          )}

          <div className="flex flex-col items-start gap-1 bg-surface/40 p-3 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center gap-2 text-gray-400 w-full">
              <Wallet className="h-4 w-4 text-cyan-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Wallet Balance</span>
            </div>
            <span className="text-xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
              ₹{user.wallet_balance?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 
        DESKTOP SIDEBAR 
      */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* 
        MOBILE TOP HEADER & DRAWER
      */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-cyan-500/30 z-40 flex items-center justify-between px-4 shadow-[0_4px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.2)]">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(0,245,255,0.6)]" />
          <div className="flex flex-col leading-none">
            <span className="font-display font-black text-sm tracking-[0.2em] text-white">ULTRA</span>
            <span className="font-display font-bold text-[8px] tracking-[0.35em] text-secondary">ESPORTS</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 border-r border-white/10 pr-3">
               <span className="text-sm font-black text-cyan-400">₹{user.wallet_balance?.toFixed(0) || '0'}</span>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -mr-2 text-gray-300 hover:text-white transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 max-w-[80vw] z-[70] shadow-2xl shadow-cyan-900/20"
            >
              <SidebarContent />
              
              <button 
                onClick={() => setMobileOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upgrade Premium Modal (From original Navbar) */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setShowUpgradeModal(false)}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-0"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl border-4 border-slate-700 bg-slate-950 p-6 md:p-8 shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.25)] text-left"
            >
              {/* Glow effects */}
              <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-yellow-500/10 blur-3xl" />

              {/* Close Button */}
              <button 
                onClick={() => setShowUpgradeModal(false)}
                disabled={isProcessing}
                className="absolute top-6 right-6 rounded-full border border-white/5 bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mt-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-4">
                  <Crown className="h-9 w-9 text-slate-950 animate-pulse" />
                </div>
                <h3 className="font-display text-2xl font-black text-white tracking-wide">
                  UPGRADE TO PREMIUM
                </h3>
                <p className="mt-2 text-sm text-gray-400 max-w-sm">
                  Elevate your competitive edge. Get a premium badge, join exclusive paid tournaments, and stand out!
                </p>
                <div className="mt-4 flex items-baseline gap-1 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-2xl">
                  <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">One-Time Fee</span>
                  <span className="text-2xl font-black text-amber-400 font-display">₹1,000</span>
                </div>
              </div>

              {/* Benefits List */}
              <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Join Paid & Elite Tournaments</h4>
                    <p className="text-xs text-gray-400">Only premium members can enter tournaments with massive prize pools.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Golden Profile Recognition</h4>
                    <p className="text-xs text-gray-400">Stand out on the leaderboard and TV chat room with a gold Premium badge.</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mt-8 space-y-4">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest block">
                  Select Payment Method
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Razorpay Payment Option */}
                  <button
                    onClick={handleRazorpayUpgrade}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 text-center hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-300 group cursor-pointer disabled:opacity-50 min-h-[140px]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="mt-3">
                      <span className="text-sm font-black text-white block">Pay with Razorpay</span>
                      <span className="text-[10px] text-gray-400 block mt-1">UPI, Cards, Netbanking</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500 mt-3 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Wallet Payment Option */}
                  <button
                    onClick={user.wallet_balance >= 1000 ? handleWalletUpgrade : undefined}
                    disabled={isProcessing || user.wallet_balance < 1000}
                    className={`flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 text-center transition-all duration-300 min-h-[140px] ${
                      user.wallet_balance >= 1000 
                        ? 'hover:border-emerald-500/50 hover:bg-emerald-500/5 group cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ${user.wallet_balance >= 1000 ? 'group-hover:scale-110 transition-transform' : ''}`}>
                      <Wallet className="h-6 w-6" />
                    </div>
                    <div className="mt-3">
                      <span className="text-sm font-black text-white block">Use Wallet</span>
                      <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                        Bal: ₹{user.wallet_balance?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {user.wallet_balance >= 1000 ? (
                      <ChevronRight className="h-4 w-4 text-gray-500 mt-3 group-hover:translate-x-1 transition-transform" />
                    ) : (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-extrabold uppercase mt-3">
                        Insufficient
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Loading overlay */}
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-3xl">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                  <span className="mt-3 text-sm font-bold text-white">Processing your payment...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
