import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Fingerprint } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const generateFingerprint = () => {
    try {
      const { userAgent, language, hardwareConcurrency, deviceMemory } = navigator;
      const screenRes = `${window.screen.width}x${window.screen.height}`;
      const raw = `${userAgent}-${language}-${hardwareConcurrency}-${deviceMemory}-${screenRes}`;
      return btoa(raw).substring(0, 32);
    } catch {
      return 'unknown_device';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const fingerprint = generateFingerprint();
      await login(email, password, requiresMfa ? mfaCode : null, fingerprint);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.detail === "MFA_REQUIRED") {
        setRequiresMfa(true);
        setError('Two-Factor Authentication required. Please enter your 6-digit code.');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-white mb-2 uppercase tracking-wider">Ultra Login</h2>
          <p className="text-textMuted text-sm">Authenticate to access the competitive network</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-500">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!requiresMfa ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-textMuted uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    required
                    className="input-field pl-11"
                    placeholder="player@network.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-textMuted uppercase tracking-wider">Passcode</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    className="input-field pl-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
              <label className="text-xs font-semibold text-textMuted uppercase tracking-wider">Authenticator Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="input-field pl-11 text-center tracking-[0.5em] font-mono text-xl"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </motion.div>
          )}

          <button type="submit" className="btn-primary w-full mt-8">
            {requiresMfa ? "Verify & Enter" : "Initialize Connection"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-primary/50 text-xs uppercase tracking-wider font-bold">
            <Fingerprint size={14} className="animate-pulse" />
            <span>Secure Connection</span>
        </div>

        <p className="mt-6 text-center text-sm text-textMuted">
          New to the network? <Link to="/register" className="text-secondary hover:text-white transition-colors">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
}
