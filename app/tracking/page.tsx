'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Confetti from '../components/Confetti';
import { useSound } from 'use-sound';
import { HomeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../components/AuthProvider';
import Link from 'next/link';

// Constante configurable pour le temps d'actualisation en secondes
const UPDATE_INTERVAL_SECONDS = 1;
// Constantes pour la gestion des retries
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 secondes
const MIN_UPDATE_INTERVAL = 1; // 10 secondes minimum
const MAX_UPDATE_INTERVAL = 100; // 5 minutes maximum

// Ajouter le cache des utilisateurs en haut du fichier, après les imports
const userDataCache: Record<string, { id: number; login: string; image: any }> = {};

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
    case 'Réussi':
      return 'status-success';
    case 'En cours':
      return 'status-warning';
    case 'Échoué':
      return 'status-error';
    default:
      return 'status-idle';
  }
}

function getProgressClass(status: string): string {
  switch (status) {
    case 'Réussi':
      return 'success';
    case 'En cours':
      return 'warning';
    case 'Échoué':
      return 'error';
    default:
      return 'default';
  }
}

// Fonction qui fait une requête API avec retry en cas d'erreur 429
async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  try {
    return await axios(url, options);
  } catch (error: any) {
    if (error.response && error.response.status === 429 && retries > 0) {
      console.log(`Rate limited. Retrying in ${delay/1000} seconds... (${retries} attempts left)`);
      // Attendre un délai avant de réessayer (backoff exponentiel)
      await new Promise(resolve => setTimeout(resolve, delay));
      // Réessayer avec un délai plus long
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function fetchStudentData(login: string): Promise<Student> {
  const token = localStorage.getItem('42_access_token');
  if (!token) {
    // Si pas de token, rediriger vers la page de login
    window.location.href = '/';
    throw new Error('Non authentifié');
  }

  console.log(`\n=== Début de la récupération des données pour ${login} ===`);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  };

  try {
    // Vérifier si les données de l'utilisateur sont déjà en cache
    let userData = userDataCache[login];
    if (!userData) {
      // Si pas en cache, récupérer les informations de l'utilisateur
      const userResponse = await fetchWithRetry(
        `https://api.intra.42.fr/v2/users/${login}`,
        authHeaders
      );
      userData = {
        id: userResponse.data.id,
        login: userResponse.data.login,
        image: userResponse.data.image
      };
      // Mettre en cache les données de l'utilisateur
      userDataCache[login] = userData;
    }

    // Récupérer tous les projets de l'utilisateur avec retry
    const projectsResponse = await fetchWithRetry(
      `https://api.intra.42.fr/v2/users/${login}/projects_users`,
      authHeaders
    );

    console.log(projectsResponse.data);
    console.log('Nombre total de projets:', projectsResponse.data.length);

    // Reste du code inchangé
    const examAttempts = projectsResponse.data.filter((project: any) => {
      const projectName = project.project.name;
      const isExam = projectName.includes('Exam Rank');
      console.log(`Projet: ${projectName} - Est un examen: ${isExam} - Note: ${project.final_mark} - Validé: ${project["validated?"]}`);
      return isExam;
    });

    // Trouver la tentative la plus récente en regardant dans toutes les équipes
    let lastExamAttempt = null;
    let mostRecentDate = new Date(0); // Date initiale très ancienne

    for (const attempt of examAttempts) {
      if (attempt.teams && attempt.teams.length > 0) {
        // Parcourir toutes les équipes de la tentative
        for (const team of attempt.teams) {
          const teamDate = new Date(team.updated_at);
          if (teamDate > mostRecentDate) {
            mostRecentDate = teamDate;
            lastExamAttempt = {
              ...attempt,
              team: team // Ajouter l'équipe la plus récente
            };
          }
        }
      }
    }

    console.log('Dernière tentative trouvée:', lastExamAttempt ? {
      name: lastExamAttempt.project.name,
      final_mark: lastExamAttempt.final_mark,
      validated: lastExamAttempt["validated?"],
      status: lastExamAttempt.status,
      updated_at: lastExamAttempt.team.updated_at,
      team_name: lastExamAttempt.team.name,
      team_final_mark: lastExamAttempt.team.final_mark
    } : 'Aucune tentative trouvée');

    let progress = 0;
    let status = 'non commencé';
    let currentExam = '';

    if (lastExamAttempt) {
      currentExam = lastExamAttempt.project.name;
      progress = lastExamAttempt.team.final_mark || 0;
      status = lastExamAttempt.team["validated?"] ? 'Réussi' : 
               lastExamAttempt.team.status === 'finished' ? 'Échoué' : 
               lastExamAttempt.team.status === 'in_progress' ? 'En cours' : 'non commencé';
    }

    console.log(`=== Résumé final pour ${login} ===`);
    console.log({
      currentExam,
      progress,
      status,
      lastAttemptDate: lastExamAttempt?.team.updated_at
    });

    return {
      id: userData.id,
      login: userData.login,
      image: userData.image,
      progress,
      status,
      projectUsers: lastExamAttempt,
      lastAttemptDate: lastExamAttempt?.team.updated_at,
      currentExam
    };
  } catch (error: any) {
    console.error(`Erreur lors de la récupération des données pour ${login}:`, error);

    // Message d'erreur plus informatif en fonction du type d'erreur
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expiré - rediriger vers la page d'accueil pour réauthentification
          localStorage.removeItem('42_access_token'); // Supprimer le token invalide
          window.location.href = '/';
          throw new Error('Token d\'authentification invalide ou expiré. Vous allez être redirigé vers la page de connexion.');
        case 403:
          throw new Error('Vous n\'avez pas les permissions nécessaires pour accéder à ces données.');
        case 404:
          throw new Error(`Étudiant "${login}" introuvable.`);
        case 429:
          throw new Error('Trop de requêtes ont été effectuées. Veuillez réessayer plus tard.');
        default:
          throw new Error(`Erreur API 42 (${error.response.status}): ${error.response.data?.message || 'Erreur inconnue'}`);
      }
    }

    throw error;
  }
}

// Composant pour le squelette de la carte étudiant
function StudentCardSkeleton({ login }: { login: string }) {
  return (
    <div className="student-card">
      <div className="student-header">
        <div className="student-avatar">
          <div className="skeleton skeleton-avatar"></div>
        </div>
        <div className="student-info">
          <div className="skeleton-text">{login}</div>
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
  const [studentsData, setStudentsData] = useState<Record<string, Student>>({});
  const [previousProgress, setPreviousProgress] = useState<Record<string, number>>({});
  const [animatedStudents, setAnimatedStudents] = useState<Record<string, boolean>>({});
  const [completedStudents, setCompletedStudents] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [nextUpdate, setNextUpdate] = useState(UPDATE_INTERVAL_SECONDS);
  const [showIntervalSlider, setShowIntervalSlider] = useState(false);
  const [customInterval, setCustomInterval] = useState(UPDATE_INTERVAL_SECONDS);
  const [tempInterval, setTempInterval] = useState(UPDATE_INTERVAL_SECONDS);
  const nextUpdateRef = useRef(UPDATE_INTERVAL_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentUpdatingLogin, setCurrentUpdatingLogin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateCycle, setUpdateCycle] = useState(0);
  const { login } = useAuth();

  // Sons
  const [playProgressSound] = useSound('/sounds/progress.mp3', { volume: 0.5 });
  const [playCompletionSound] = useSound('/sounds/completion.mp3', { volume: 0.7 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const studentsParam = searchParams.get('students');
    if (studentsParam) {
      setStudents(studentsParam.split(','));
    }
  }, [searchParams]);

  // Fonction pour actualiser un étudiant spécifique
  const updateStudentData = useCallback(async (login: string) => {
    try {
      setCurrentUpdatingLogin(login);
      const studentData = await fetchStudentData(login);

      setStudentsData(prevData => {
        const prevStudent = prevData[login];

        // Vérifier si c'est la première récupération de données pour l'étudiant
        const isFirstLoad = !prevStudent;

        // Si ce n'est pas le premier chargement, vérifier la progression
        if (!isFirstLoad) {
          const prevProgress = prevStudent.progress;
          const newProgress = studentData.progress;

          // Vérifier si la progression a augmenté
          if (newProgress > prevProgress) {
            // Stocker les données précédentes pour référence
            setPreviousProgress(prev => ({
              ...prev,
              [login]: prevProgress
            }));

            // Indiquer que l'étudiant a une progression améliorée
            setAnimatedStudents(prev => ({
              ...prev,
              [login]: true
            }));

            // Si l'étudiant a atteint 100% et n'était pas déjà à 100%
            if (newProgress === 100 && prevProgress < 100 && !completedStudents[login]) {
              setCompletedStudents(prev => ({
                ...prev,
                [login]: true
              }));

              // Déclencher les confettis avec le même pattern de réinitialisation
              setShowConfetti(false);
              setTimeout(() => {
                setShowConfetti(true);
              }, 50);

              // Jouer le son de complétion
              playCompletionSound();

              // Désactiver les confettis après 5 secondes
              setTimeout(() => {
                setShowConfetti(false);
              }, 5000);
            } else {
              // Jouer un son pour l'avancement normal
              playProgressSound();
            }

            // Réinitialiser l'animation après 10 secondes
            setTimeout(() => {
              setAnimatedStudents(prev => ({
                ...prev,
                [login]: false
              }));
            }, 10000);
          }
        }

        return {
          ...prevData,
          [login]: studentData
        };
      });

      return true;
    } catch (err: any) {
      console.error(`Erreur lors de la mise à jour des données pour ${login}:`, err);

      // Message d'erreur plus informatif
      const errorMessage = err.message || 'Erreur lors de la mise à jour des données. Veuillez vérifier votre connexion à l\'API 42.';
      setError(errorMessage);

      // Ajouter un délai plus long en cas d'erreur 429
      if (err.response && err.response.status === 429) {
        // Attendre une minute avant de continuer
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      return false;
    } finally {
      setCurrentUpdatingLogin(null);
    }
  }, [playProgressSound, playCompletionSound, completedStudents]);

  // Fonction pour démarrer le timer avec une précision correcte
  const startTimer = useCallback((seconds: number, onComplete: () => void) => {
    // Nettoyer tout timer existant
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Initialiser les valeurs
    nextUpdateRef.current = seconds;
    setNextUpdate(seconds);

    // Obtenir l'heure de début précise
    const startTime = Date.now();
    const endTime = startTime + (seconds * 1000);

    // Créer un nouvel intervalle qui vérifie le temps restant toutes les 100ms
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      // Mettre à jour l'état seulement si le nombre de secondes a changé
      if (remaining !== nextUpdateRef.current) {
        nextUpdateRef.current = remaining;
        setNextUpdate(remaining);
      }

      // Si le temps est écoulé, exécuter le callback et nettoyer
      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        onComplete();
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Fonction pour gérer le changement d'intervalle pendant le glissement
  const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    if (newValue >= MIN_UPDATE_INTERVAL && newValue <= MAX_UPDATE_INTERVAL) {
      setTempInterval(newValue);
    }
  };

  // Fonction pour appliquer le changement d'intervalle à la fin du glissement
  const handleIntervalChangeEnd = () => {
    if (tempInterval !== customInterval) {
      setCustomInterval(tempInterval);
      // Redémarrer le timer avec la nouvelle valeur
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimer(tempInterval, () => {
        setUpdateCycle(prev => prev + 1);
      });
    }
  };

  // Fonction pour actualiser tous les étudiants séquentiellement avec le nouveau timer
  const updateAllStudentsSequentially = useCallback(async () => {
    setError(null);

    for (let i = 0; i < students.length; i++) {
      const login = students[i];
      const success = await updateStudentData(login);

      // Si la mise à jour a échoué, arrêtez la séquence et attendez le prochain cycle
      if (!success) {
        console.log("Interruption de la séquence d'actualisation suite à une erreur");
        break;
      }

      // Si ce n'est pas le dernier étudiant, attendre le temps défini avant de passer au suivant
      if (i < students.length - 1) {
        await new Promise<void>(resolve => {
          startTimer(customInterval, () => resolve());
        });
      }
    }

    // Une fois tous les étudiants mis à jour, démarrer le timer pour le prochain cycle
    startTimer(customInterval, () => {
      setUpdateCycle(prev => prev + 1);
    });
  }, [students, updateStudentData, startTimer, customInterval]);

  // Effet pour le chargement initial et les actualisations périodiques
  useEffect(() => {
    let isActive = true;
    let timerCleanup: (() => void) | null = null;

    // Fonction asynchrone interne pour effectuer la mise à jour
    const performUpdate = async () => {
      if (students.length > 0 && mounted && isActive) {
        await updateAllStudentsSequentially();
      }
    };

    // Appel immédiat de la fonction asynchrone
    performUpdate();

    // Fonction de nettoyage (clean-up)
    return () => {
      isActive = false;
      if (timerCleanup) {
        timerCleanup();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [students, mounted, updateCycle, updateAllStudentsSequentially]);

  // Test caché pour déclencher l'animation des 100% sans affecter les données
  const triggerCompletionAnimation = useCallback((login: string) => {
    // Déclencher les confettis
    setShowConfetti(false); // Réinitialiser d'abord pour s'assurer que le changement d'état sera détecté
    setTimeout(() => {
      setShowConfetti(true);
    }, 50);

    // Jouer le son de complétion
    playCompletionSound();

    // Activer l'animation sur la carte
    setAnimatedStudents(prev => ({
      ...prev,
      [login]: true
    }));

    // Réinitialiser l'animation après 10 secondes
    setTimeout(() => {
      setAnimatedStudents(prev => ({
        ...prev,
        [login]: false
      }));
    }, 10000);
  }, [playCompletionSound]);

  // Test caché pour déclencher l'animation de progression sans affecter les données
  const triggerProgressAnimation = useCallback((login: string) => {
    // Jouer le son de progression
    playProgressSound();

    // Activer l'animation sur la carte
    setAnimatedStudents(prev => ({
      ...prev,
      [login]: true
    }));

    // Réinitialiser l'animation après 10 secondes
    setTimeout(() => {
      setAnimatedStudents(prev => ({
        ...prev,
        [login]: false
      }));
    }, 10000);
  }, [playProgressSound]);

  // En cas d'erreur d'authentification, proposer de se reconnecter
  const handleReconnect = () => {
    login(); // Utiliser la fonction login du AuthProvider
  };

  if (!mounted) {
    return null;
  }

  if (error && Object.keys(studentsData).length === 0) {
    const isAuthError = error.includes('Token') || error.includes('authentifi');

    return (
      <div className="container">
        <div className="error-message">
          {error}
          {isAuthError && (
            <button onClick={handleReconnect} className="btn btn-primary reconnect-btn">
              Se reconnecter
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Composant de confettis qui sera activé lors d'un accomplissement */}
      <Confetti active={showConfetti} />

      <div className="header">
        <div className="header-left">
          <Link href="/" className="home-button" title="Retour à l'accueil">
            <HomeIcon className="home-icon" />
          </Link>
          <h1 className="title">Suivi des Examens 42</h1>
        </div>
        <div className="timer" onClick={() => setShowIntervalSlider(!showIntervalSlider)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', width: '100%', height: '100%' }}>
            <span className="timer-text" style={{ lineHeight: '1' }}>Prochaine actualisation dans : </span>
            <span className="timer-value" style={{ minWidth: '3ch', textAlign: 'center', lineHeight: '1' }}>{nextUpdate}s</span>
          </div>
          {showIntervalSlider && (
            <div className="interval-slider-container">
              <input
                type="range"
                min={MIN_UPDATE_INTERVAL}
                max={MAX_UPDATE_INTERVAL}
                value={tempInterval}
                onChange={handleIntervalChange}
                onMouseUp={handleIntervalChangeEnd}
                onTouchEnd={handleIntervalChangeEnd}
                className="interval-slider"
                style={{ margin: '0', position: 'relative', top: '2px' }}
              />
              <span className="interval-value">{tempInterval}s</span>
            </div>
          )}
        </div>
      </div>

      <div className="students-grid">
        {students.map(login => {
          const studentData = studentsData[login];
          const isAnimated = animatedStudents[login];

          // Si nous n'avons pas encore les données de cet étudiant, afficher un squelette
          if (!studentData) {
            return <StudentCardSkeleton key={`skeleton-${login}`} login={login} />;
          }

          // Sinon, afficher la carte avec les données de l'étudiant
          return (
            <div
              key={studentData.id}
              className={`student-card ${isAnimated ? 'card-bounce rainbow-shadow' : ''}`}
            >
              {currentUpdatingLogin === login && (
                <div className="loading-indicator" title="Actualisation des données en cours..."></div>
              )}
              <div className="student-header">
                <div className="student-avatar">
                  <img
                    src={studentData.image?.versions?.small || studentData.image?.link}
                    alt={studentData.login}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://cdn.intra.42.fr/users/default.png';
                    }}
                  />
                  <div className={`status-indicator ${getStatusClass(studentData.status)}`}></div>
                </div>
                <div className="student-info">
                  <h2
                    className="student-name"
                    onClick={() => triggerCompletionAnimation(studentData.login)}
                    style={{ cursor: 'pointer' }}
                  >
                    {studentData.login}
                  </h2>
                  <p
                    className="student-status"
                    onClick={() => triggerProgressAnimation(studentData.login)}
                    style={{ cursor: 'pointer' }}
                  >
                    {studentData.status}
                    {studentData.groupNumber !== undefined && (
                      <span className="group-number">
                        (Groupe {studentData.groupNumber})
                      </span>
                    )}
                  </p>
                  {studentData.currentExam && (
                    <p className="exam-name">{studentData.currentExam}</p>
                  )}
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Progression</span>
                  <span className="progress-value">{studentData.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${getProgressClass(studentData.status)}`}
                    style={{ width: `${studentData.progress}%` }}
                  ></div>
                </div>
                {studentData.lastAttemptDate && (
                  <div className="attempt-date">
                    Dernier essai : {formatDate(studentData.lastAttemptDate)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}