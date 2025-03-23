'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, CheckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface Project {
  id: number;
  name: string;
  exam: boolean;
}

interface TeamUser {
  id: number;
  login: string;
  url: string;
  leader: boolean;
  occurrence: number;
}

interface Team {
  id: number;
  name: string;
  status: string;
  final_mark: number | null;
  created_at: string;
  users: TeamUser[];
  validated?: boolean;
  closed?: boolean;
}

interface ExamSelectorProps {
  onSelectUser: (login: string) => void;
}

export default function ExamSelector({ onSelectUser }: ExamSelectorProps) {
  // États pour gérer les données des examens et les interactions utilisateur
  const [exams, setExams] = useState<Project[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExamName, setSelectedExamName] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Référence pour la gestion du clic à l'extérieur du dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Charger les examens disponibles lors du montage du composant
  useEffect(() => {
    const fetchExams = async () => {
      const token = localStorage.getItem('42_access_token');
      if (!token) {
        console.error('Token d\'authentification non trouvé');
        setError('Token d\'authentification non trouvé');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get('https://api.intra.42.fr/v2/me/projects?filter[exam]=true&cursus_id=21', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setExams(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des examens:', error);
        setError('Impossible de charger les examens');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  // Gérer le clic à l'extérieur du dropdown pour le fermer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Charger les équipes quand un examen est sélectionné
  useEffect(() => {
    const fetchProjectTeams = async () => {
      if (!selectedExamId) return;

      const token = localStorage.getItem('42_access_token');
      if (!token) {
        console.error('Token d\'authentification non trouvé');
        setError('Token d\'authentification non trouvé');
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(
          `https://api.intra.42.fr/v2/projects/${selectedExamId}/teams?filter[status]=in_progress&filter[campus]=62`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setTeams(response.data);
        setError(null);
      } catch (error) {
        console.error('Erreur lors de la récupération des équipes:', error);
        setError('Impossible de charger les équipes');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectTeams();
  }, [selectedExamId]);

  // Obtenir la liste unique des utilisateurs
  const uniqueUsers = Array.from(new Set(
    teams.flatMap(team => team.users)
      .map(user => JSON.stringify(user))))
    .map(str => JSON.parse(str));

  // Gérer la sélection d'un examen
  const handleExamSelect = (examId: number, examName: string) => {
    setSelectedExamId(examId);
    setSelectedExamName(examName);
    setIsDropdownOpen(false);
  };

  return (
    <div className="exam-selector">
      <div className="exam-dropdown" ref={dropdownRef}>
        <button
          className="exam-button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <span className="exam-button-content">
            <span className="exam-button-text">
              {selectedExamName || 'Sélectionner un examen'}
            </span>
          </span>
          <span className={`exam-button-icon ${isDropdownOpen ? 'open' : ''}`}>
            <ChevronDownIcon height={18} width={18} />
          </span>
        </button>

        <div className={`exam-options ${isDropdownOpen ? 'visible' : ''}`}>
          {exams.map((exam) => (
            <div
              key={exam.id}
              className={`exam-option ${selectedExamName === exam.name ? 'selected' : ''}`}
              onClick={() => handleExamSelect(exam.id, exam.name)}
            >
              <span className="exam-option-icon">
                <CheckIcon height={18} width={18} />
              </span>
              {exam.name}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="spinner-ring mx-auto"></div>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      {!loading && selectedExamId && uniqueUsers.length > 0 && (
        <div>
          <h3 className="user-section-title">
            Étudiants en cours d'examen <span className="user-count-badge">{uniqueUsers.length}</span>
          </h3>
          <div className="users-grid">
            {uniqueUsers.map((user: TeamUser) => (
              <button
                key={user.id}
                className="user-btn"
                onClick={() => onSelectUser(user.login)}
              >
                {user.login}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && selectedExamId && uniqueUsers.length === 0 && (
        <div className="mt-6 text-center py-8 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">

          <h3 className="mt-2 text-sm font-medium">Aucun étudiant en cours d'examen</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Veuillez sélectionner un autre examen
          </p>
        </div>
      )}
    </div>
  );
}