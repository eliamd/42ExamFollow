'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour initier la connexion avec l'API 42
  const login = () => {
    const clientId = process.env.NEXT_PUBLIC_42_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_42_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('Les identifiants OAuth sont manquants');
      return;
    }

    // Rediriger vers le point de terminaison d'autorisation de l'API 42
    const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = authUrl;
  };

  // Fonction pour se déconnecter
  const logout = () => {
    localStorage.removeItem('42_access_token');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    // Vérifier si un token est présent dans le localStorage
    const token = localStorage.getItem('42_access_token');

    // Vérifier si un token est présent dans l'URL (après redirection)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    // Si un token est dans l'URL, le sauvegarder dans localStorage et le supprimer de l'URL
    if (tokenFromUrl) {
      console.log('Token trouvé dans l\'URL, sauvegarde...');
      localStorage.setItem('42_access_token', tokenFromUrl);

      // Nettoyer l'URL en supprimant le paramètre token
      urlParams.delete('token');
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
      window.history.replaceState({}, document.title, newUrl);

      setIsAuthenticated(true);
    } else if (token) {
      // Si un token existe dans localStorage, l'utilisateur est considéré comme authentifié
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, []);

  // Afficher un état de chargement pendant la vérification de l'authentification
  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}