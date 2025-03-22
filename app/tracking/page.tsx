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
  currentExam?: string;
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

  console.log(`\n=== Début de la récupération des données pour ${login} ===`);

  // Récupérer les informations de l'utilisateur
  const userResponse = await axios.get(`https://api.intra.42.fr/v2/users/${login}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Récupérer tous les projets de l'utilisateur
  const projectsResponse = await axios.get(`https://api.intra.42.fr/v2/users/${login}/projects_users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('Nombre total de projets:', projectsResponse.data.length);

  // Filtrer pour ne garder que les examens
  const examAttempts = projectsResponse.data.filter((project: any) => {
    const projectName = project.project.name;
    const isExam = projectName.includes('Exam Rank');
    console.log(`Projet: ${projectName} - Est un examen: ${isExam} - Note: ${project.final_mark} - Validé: ${project["validated?"]}`);
    return isExam;
  });

  console.log('Tentatives d\'examens trouvées:', examAttempts.map((project: any) => ({
    name: project.project.name,
    final_mark: project.final_mark,
    validated: project["validated?"],
    status: project.status,
    created_at: project.created_at
  })));

  // Trouver la dernière tentative (la plus récente)
  const lastExamAttempt = examAttempts.length > 0 ?
    examAttempts.reduce((latest: any, current: any) => {
      const latestDate = new Date(latest.created_at);
      const currentDate = new Date(current.created_at);
      return currentDate > latestDate ? current : latest;
    }, examAttempts[0]) : null;

  console.log('Dernière tentative trouvée:', lastExamAttempt ? {
    name: lastExamAttempt.project.name,
    final_mark: lastExamAttempt.final_mark,
    validated: lastExamAttempt["validated?"],
    status: lastExamAttempt.status,
    created_at: lastExamAttempt.created_at
  } : 'Aucune tentative trouvée');

  let progress = 0;
  let status = 'non commencé';
  let currentExam = '';

  if (lastExamAttempt) {
    currentExam = lastExamAttempt.project.name;

    if (lastExamAttempt.final_mark !== null) {
      progress = lastExamAttempt.final_mark;
      status = lastExamAttempt["validated?"] ? 'réussi' : 'échoué';
    } else if (lastExamAttempt.status === 'finished') {
      progress = 100;
      status = 'en attente de correction';
    } else if (lastExamAttempt.status === 'in_progress') {
      const now = new Date();
      const startDate = new Date(lastExamAttempt.created_at);
      const examDuration = 3 * 60 * 60 * 1000; // 3 heures
      const timeElapsed = now.getTime() - startDate.getTime();

      if (timeElapsed < examDuration) {
        progress = Math.min(100, Math.round((timeElapsed / examDuration) * 100));
        status = 'en cours';
      } else {
        progress = 100;
        status = 'terminé';
      }
    }
  }

  console.log(`=== Résumé final pour ${login} ===`);
  console.log({
    currentExam,
    progress,
    status,
    lastAttemptDate: lastExamAttempt?.created_at
  });

  return {
    id: userResponse.data.id,
    login: userResponse.data.login,
    image: userResponse.data.image,
    progress,
    status,
    projectUsers: lastExamAttempt,
    lastAttemptDate: lastExamAttempt?.created_at,
    currentExam
  };
}

// Composant pour le squelette de la carte étudiant
function StudentCardSkeleton() {
  return (
    <div className="student-card">
      <div className="student-header">
        <div className="student-avatar">
          <div className="skeleton skeleton-avatar"></div>
        </div>
        <div className="student-info">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text short"></div>
          <div className="skeleton skeleton-text medium"></div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <div className="skeleton skeleton-text short"></div>
          <div className="skeleton skeleton-text short"></div>
        </div>
        <div className="progress-bar skeleton"></div>
        <div className="skeleton skeleton-text" style={{ marginTop: '1rem' }}></div>
      </div>
    </div>
  );
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
        {isLoading ? (
          // Afficher des squelettes pendant le chargement
          students.map((student, index) => (
            <StudentCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          // Afficher les données réelles
          studentsData?.map((student: Student) => (
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
                  {student.currentExam && (
                    <p className="exam-name">{student.currentExam}</p>
                  )}
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
          ))
        )}
      </div>
    </div>
  );
}