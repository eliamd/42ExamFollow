'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from './components/AuthProvider';

// Interface pour stocker les groupes dans l'historique
interface HistoryGroup {
  id: string;
  students: string[];
  timestamp: number;
}

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryGroup[]>([]);

  // Charger l'historique depuis localStorage au montage du composant
  useEffect(() => {
    if (isAuthenticated) {
      const savedHistory = localStorage.getItem('42_eval_history');
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          // Trier par date décroissante (le plus récent en premier)
          setHistory(parsedHistory.sort((a: HistoryGroup, b: HistoryGroup) => b.timestamp - a.timestamp));
        } catch (e) {
          console.error('Erreur lors de la récupération de l\'historique:', e);
          // Réinitialiser l'historique en cas d'erreur
          localStorage.setItem('42_eval_history', JSON.stringify([]));
        }
      }
    }
  }, [isAuthenticated]);

  // Fonction pour sauvegarder un groupe dans l'historique
  const saveGroupToHistory = (studentsToSave: string[]) => {
    if (studentsToSave.length === 0) return;

    const newGroup: HistoryGroup = {
      id: Date.now().toString(),
      students: [...studentsToSave],
      timestamp: Date.now(),
    };

    // Récupérer et mettre à jour l'historique existant
    const savedHistory = localStorage.getItem('42_eval_history');
    let updatedHistory: HistoryGroup[] = [];

    if (savedHistory) {
      try {
        updatedHistory = JSON.parse(savedHistory);
      } catch (e) {
        console.error('Erreur lors de la récupération de l\'historique:', e);
      }
    }

    // Limiter l'historique à 10 entrées et éviter les doublons
    const filteredHistory = updatedHistory
      .filter(group =>
        // Considérer comme doublon si les deux groupes contiennent exactement les mêmes étudiants
        JSON.stringify([...group.students].sort()) !==
        JSON.stringify([...studentsToSave].sort())
      )
      .slice(0, 9); // Garder seulement les 9 plus récents pour faire place au nouveau

    const newHistory = [newGroup, ...filteredHistory];
    localStorage.setItem('42_eval_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  // Fonction pour supprimer un groupe de l'historique
  const removeFromHistory = (groupId: string) => {
    const updatedHistory = history.filter(group => group.id !== groupId);
    localStorage.setItem('42_eval_history', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery && !students.includes(searchQuery)) {
      setStudents([...students, searchQuery]);
      setSearchQuery('');
    }
  };

  const handleStartTracking = () => {
    if (students.length > 0) {
      // Sauvegarder le groupe actuel dans l'historique
      saveGroupToHistory(students);

      const queryString = students.join(',');
      window.location.href = `/tracking?students=${queryString}`;
    }
  };

  // Fonction pour charger un groupe depuis l'historique
  const loadGroupFromHistory = (group: HistoryGroup) => {
    setStudents(group.students);
  };

  // Formatage de la date pour l'affichage
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

        {/* Section historique */}
        {history.length > 0 && (
          <div className="history-section">
            <h2 className="history-title">
              <ClockIcon className="history-icon" />
              Historique des sessions
            </h2>
            <div className="history-list">
              {history.map((group) => (
                <div key={group.id} className="history-item">
                  <div className="history-item-content" onClick={() => loadGroupFromHistory(group)}>
                    <div className="history-date">{formatDate(group.timestamp)}</div>
                    <div className="history-students">
                      {group.students.map(student => (
                        <span key={student} className="history-student-tag">{student}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="history-delete"
                    onClick={() => removeFromHistory(group.id)}
                    aria-label="Supprimer de l'historique"
                  >
                    <TrashIcon className="history-delete-icon" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}