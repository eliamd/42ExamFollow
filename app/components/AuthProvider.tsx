'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('42_access_token');
    setIsAuthenticated(!!token);
  }, []);

  const login = async () => {
    try {
      const response = await axios.get('/api/auth');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('42_access_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);