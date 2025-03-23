import { useState, useEffect } from 'react';
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
  const [exams, setExams] = useState<Project[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      const token = localStorage.getItem('42_access_token');
      if (!token) {
        console.error('Token d\'authentification non trouvé');
        return;
      }

      try {
        const response = await axios.get('https://api.intra.42.fr/v2/me/projects?filter[exam]=true&cursus_id=21', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setExams(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des examens:', error);
      }
    };

    fetchExams();
  }, []);

  useEffect(() => {
    const fetchProjectTeams = async () => {
      if (!selectedExam) return;

      const token = localStorage.getItem('42_access_token');
      if (!token) {
        console.error('Token d\'authentification non trouvé');
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(
          `https://api.intra.42.fr/v2/projects/${selectedExam}/teams?filter[status]=in_progress&filter[campus]=62`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setTeams(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des équipes:', error);
      }
      setLoading(false);
    };

    fetchProjectTeams();
  }, [selectedExam]);

  // Obtenir la liste unique des utilisateurs
  const uniqueUsers = Array.from(new Set(
    teams.flatMap(team => team.users)
      .map(user => JSON.stringify(user))))
    .map(str => JSON.parse(str));

  return (
    <div className="exam-selector">
      <div className="mb-6">
        <label htmlFor="exam-select" className="block text-sm font-medium mb-2">
          Sélectionner un examen
        </label>
        <select
          id="exam-select"
          className="input-group"
          value={selectedExam || ''}
          onChange={(e) => setSelectedExam(Number(e.target.value))}
        >
          <option value="">Choisir un examen...</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
        </div>
      )}

      {!loading && selectedExam && uniqueUsers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">
            Étudiants en cours d'examen ({uniqueUsers.length})
          </h3>
          <div className="user-buttons-grid">
            {uniqueUsers.map((user: TeamUser) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.login)}
                className="user-button"
              >
                {user.login}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && selectedExam && uniqueUsers.length === 0 && (
        <div className="mt-6 text-center py-8 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium">Aucun étudiant en cours d'examen</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Veuillez sélectionner un autre examen
          </p>
        </div>
      )}
    </div>
  );
} 