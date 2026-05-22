import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, AlertCircle, Shield } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'player',
    avatar: 'http://localhost:8000/static/avatars/avatar1.png'
  });

  const avatars = [
    { id: 1, url: 'http://localhost:8000/static/avatars/avatar1.png' },
    { id: 2, url: 'http://localhost:8000/static/avatars/avatar2.png' },
    { id: 3, url: 'http://localhost:8000/static/avatars/avatar3.png' },
  ];
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password, formData.role, formData.avatar);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-white mb-2">CREATE ID</h2>
          <p className="text-textMuted text-sm">Register your profile on the network</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-500">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-textMuted uppercase tracking-wider">Alias / Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                name="name"
                required
                className="input-field pl-11"
                placeholder="ProGamer99"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-textMuted uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                name="email"
                required
                className="input-field pl-11"
                placeholder="player@network.com"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                required
                className="input-field pl-11"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>          <div className="space-y-3">
            <label className="text-xs font-semibold text-textMuted uppercase tracking-wider">Select Combat Avatar</label>
            <div className="flex justify-between gap-4">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: avatar.url })}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                    formData.avatar === avatar.url ? 'border-primary shadow-[0_0_15px_rgba(0,255,63,0.5)] scale-110' : 'border-white/10 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <img src={avatar.url} alt={`Avatar ${avatar.id}`} className="w-full h-full object-cover" />
                  {formData.avatar === avatar.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Shield className="text-white h-8 w-8" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full mt-8">
            Register Profile
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-textMuted">
          Already have an ID? <Link to="/login" className="text-primary hover:text-white transition-colors">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
}
