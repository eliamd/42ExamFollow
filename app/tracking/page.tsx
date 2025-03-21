'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Student {
  id: number;
  login: string;
  image: {
    link: string;
    versions: {
      small: string;
    };
  };
  progress: number;
  status: string;
  projectUsers?: any;
  lastAttemptDate?: string;
  groupNumber?: number;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

function extractGroupNumber(teamName: string): number {
  const match = teamName.match(/group[- ]?(-?\d+)/i);
  return match ? parseInt(match[1]) : -999; // Utiliser -999 pour les groupes sans numéro
}

function findHighestGroupAttempt(attempts: any[]): any {
  if (!attempts || attempts.length === 0) return null;

  // Filtrer uniquement les tentatives avec un nom d'équipe
  const validAttempts = attempts.filter(attempt => attempt.team?.name);

  if (validAttempts.length === 0) return null;

  // Trouver le plus grand numéro de groupe
  const maxGroupNumber = Math.max(...validAttempts.map(attempt =>
    extractGroupNumber(attempt.team.name)
  ));

  // Retourner la tentative correspondant au plus grand numéro de groupe
  return validAttempts.find(attempt =>
    extractGroupNumber(attempt.team.name) === maxGroupNumber
  );
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'réussi':
      return 'status-success';
    case 'en cours':
      return 'status-warning';
    case 'échoué':
      return 'status-error';
    default:
      return 'status-idle';
  }
}

function getProgressClass(status: string): string {
  switch (status) {
    case 'réussi':
      return 'success';
    case 'en cours':
      return 'warning';
    case 'échoué':
      return 'error';
    default:
      return 'default';
  }
}

async function fetchStudentData(login: string): Promise<Student> {
  const token = localStorage.getItem('42_access_token');
  if (!token) {
    throw new Error('Non authentifié');
  }

  // Récupérer les informations de l'utilisateur
  const userResponse = await axios.get(`https://api.intra.42.fr/v2/users/${login}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Récupérer les projets de l'utilisateur
  const projectsResponse = await axios.get(`https://api.intra.42.fr/v2/users/${login}/projects_users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Debug: afficher tous les projets pour voir leur structure
  console.log('Projets de', login, ':', projectsResponse.data);

  // Filtrer pour ne garder que les examens avec une logique plus précise
  const examAttempts = projectsResponse.data
    .filter((project: any) => {
      const projectName = project.project.name.toLowerCase();
      return projectName.includes('exam-') || projectName.includes('exam_');
    })
    .filter((project: any) => project.team !== null); // S'assurer qu'il y a une équipe

  console.log('Tentatives d\'examens trouvées:', examAttempts);

  // Trouver la tentative avec le plus grand numéro de groupe
  const lastExamAttempt = findHighestGroupAttempt(examAttempts);
  console.log('Dernière tentative trouvée:', lastExamAttempt);

  const now = new Date();
  const lastAttemptDate = lastExamAttempt ? new Date(lastExamAttempt.created_at) : null;
  const groupNumber = lastExamAttempt ? extractGroupNumber(lastExamAttempt.team.name) : undefined;

  let progress = 0;
  let status = 'non commencé';

  if (lastExamAttempt) {
    if (lastExamAttempt.final_mark !== null) {
      progress = lastExamAttempt.final_mark;
      status = lastExamAttempt["validated?"] ? 'réussi' : 'échoué';
    } else if (lastExamAttempt.status === 'finished') {
      progress = 100;
      status = 'en attente de correction';
    } else if (lastExamAttempt.status === 'in_progress') {
      // Calculer le temps écoulé depuis le début de l'examen
      const examDuration = 3 * 60 * 60 * 1000; // 3 heures en millisecondes
      const timeElapsed = now.getTime() - lastAttemptDate!.getTime();

      if (timeElapsed < examDuration) {
        // L'examen est en cours
        progress = Math.min(100, Math.round((timeElapsed / examDuration) * 100));
        status = 'en cours';
      } else {
        // L'examen est terminé mais pas encore noté
        progress = 100;
        status = 'terminé';
      }
    }
  }

  return {
    id: userResponse.data.id,
    login: userResponse.data.login,
    image: userResponse.data.image,
    progress,
    status,
    projectUsers: lastExamAttempt,
    lastAttemptDate: lastAttemptDate?.toISOString(),
    groupNumber: groupNumber,
  };
}

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<string[]>([]);
  const [nextUpdate, setNextUpdate] = useState(15);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const studentsParam = searchParams.get('students');
    if (studentsParam) {
      setStudents(studentsParam.split(','));
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdate((prev) => (prev > 0 ? prev - 1 : 15));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { data: studentsData, isLoading, error } = useQuery<Student[]>({
    queryKey: ['students', students],
    queryFn: async () => {
      setNextUpdate(15);
      return Promise.all(students.map(fetchStudentData));
    },
    enabled: students.length > 0,
    refetchInterval: 15000,
    gcTime: 60000,
    staleTime: 10000,
  });

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          Une erreur est survenue. Veuillez vérifier votre connexion à l'API 42.
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Suivi des Examens 42</h1>
        <div className="timer">
          <span className="timer-text">Actualisation dans :</span>
          <span className="timer-value">{nextUpdate}s</span>
        </div>
      </div>

      <div className="students-grid">
        {studentsData?.map((student: Student) => (
          <div key={student.id} className="student-card">
            <div className="student-header">
              <div className="student-avatar">
                <img
                  src={student.image?.versions?.small || student.image?.link}
                  alt={student.login}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://cdn.intra.42.fr/users/default.png';
                  }}
                />
                <div className={`status-indicator ${getStatusClass(student.status)}`}></div>
              </div>
              <div className="student-info">
                <h2 className="student-name">{student.login}</h2>
                <p className="student-status">
                  {student.status}
                  {student.groupNumber !== undefined && (
                    <span className="group-number">
                      (Groupe {student.groupNumber})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-label">Progression</span>
                <span className="progress-value">{student.progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressClass(student.status)}`}
                  style={{ width: `${student.progress}%` }}
                ></div>
              </div>
              {student.lastAttemptDate && (
                <div className="attempt-date">
                  Dernier essai : {formatDate(student.lastAttemptDate)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}