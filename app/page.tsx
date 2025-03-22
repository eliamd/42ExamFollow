'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from './components/AuthProvider';

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<string[]>([]);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery && !students.includes(searchQuery)) {
      setStudents([...students, searchQuery]);
      setSearchQuery('');
    }
  };

  const handleStartTracking = () => {
    if (students.length > 0) {
      const queryString = students.join(',');
      window.location.href = `/tracking?students=${queryString}`;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page-container">
        <div className="login-container">
          <h1 className="app-title">42 Eval Viewer</h1>
          <p className="app-description">
            Connectez-vous avec votre compte 42 pour commencer
          </p>
          <button
            onClick={() => login()}
            className="btn btn-primary btn-block"
          >
            Se connecter avec 42
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="selection-container">
        <h1 className="app-title">42 Eval Viewer</h1>
        <p className="app-description">
          Suivez la progression des étudiants en temps réel
        </p>

        <form onSubmit={handleAddStudent}>
          <div className="input-group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Login de l'étudiant..."
              className="input"
            />
            <button
              type="submit"
              className="btn-search"
            >
              <MagnifyingGlassIcon className="search-icon" />
            </button>
          </div>
        </form>

        {students.length > 0 && (
          <div>
            <div className="tags-container">
              {students.map((student) => (
                <span key={student} className="tag">
                  {student}
                  <button
                    type="button"
                    onClick={() => setStudents(students.filter((s) => s !== student))}
                    className="tag-close"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={handleStartTracking}
              className="btn btn-primary btn-block"
            >
              Commencer le suivi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}