import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/profile');
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password, mfaToken = null, fingerprint = 'unknown') => {
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      
      const clientSecretObj = { fingerprint };
      if (mfaToken) {
        clientSecretObj.mfa_token = mfaToken;
      }
      params.append('client_secret', JSON.stringify(clientSecretObj));
      
      const response = await api.post('/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password, role, avatar) => {
    try {
      await api.post('/register', { name, email, password, role, avatar });
      return await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, register, loading, fetchUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
