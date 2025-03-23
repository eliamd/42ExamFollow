'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface User {
  id: number;
  login: string;
  first_name: string;
  last_name: string;
  image: {
    link: string;
  };
}

interface UserSearchProps {
  onSelectUser: (login: string) => void;
}

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('42_access_token');
        if (!token) {
          throw new Error('Token non trouvé');
        }

        const response = await axios.get(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setSuggestions(response.data);
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectUser = (user: User) => {
    onSelectUser(user.login);
    setSearchQuery('');
    setSuggestions([]);
  };

  return (
    <div className="search-container" ref={searchRef}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Login de l'étudiant..."
            className="input"
          />
          <button type="submit" className="btn-search">
            <MagnifyingGlassIcon className="search-icon" />
          </button>
        </div>
      </form>

      {suggestions.length > 0 && (
        <div className="suggestions-container">
          {suggestions.map((user) => (
            <div
              key={user.id}
              className="suggestion-item"
              onClick={() => handleSelectUser(user)}
            >
              <img
                src={user.image.link}
                alt={`${user.login}'s avatar`}
                className="suggestion-avatar"
              />
              <div className="suggestion-info">
                <span className="suggestion-login">{user.login}</span>
                <span className="suggestion-name">
                  {user.first_name} {user.last_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 