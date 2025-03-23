'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Confetti from '../components/Confetti';
import { useSound } from 'use-sound';
import { HomeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../components/AuthProvider';
import Link from 'next/link';
// Importer toutes les fonctions nécessaires depuis apiUtils
import {
  fetchStudentData,
  initApiCounter,
  getApiCallCount,
  fetchWithRetry,
  isExam,
  getExamOrder,
  getStatusClass,
  getProgressClass,
  formatDate,
  clearStudentCache,  // Ajouter ces nouvelles fonctions
  clearAllCache
} from '../utils/apiUtils';

// Constantes pour la gestion des requêtes API et des intervalles
const BASE_UPDATE_INTERVAL = 4; // Intervalle minimum de base en secondes
const MIN_UPDATE_INTERVAL = 1;  // Minimum absolu pour l'interface utilisateur
const MAX_UPDATE_INTERVAL = 100; // Maximum pour l'interface utilisateur
const API_HOURLY_LIMIT = 1200;   // Limite d'API par heure
const API_SAFETY_MARGIN = 50;    // Marge de sécurité à conserver
const REQUESTS_PER_STUDENT = 1;  // Une seule requête par étudiant grâce au cache

/**
 * Calcule l'intervalle optimal de mise à jour en fonction du nombre d'étudiants
 * pour ne pas dépasser la limite de requêtes API
 */
const calculateOptimalInterval = (studentCount: number): number => {
  if (studentCount === 0) return BASE_UPDATE_INTERVAL;

  // Nombre total de requêtes disponibles par heure avec marge de sécurité
  const availableRequests = API_HOURLY_LIMIT - API_SAFETY_MARGIN;

  // Nombre de cycles possibles par heure = requêtes disponibles / requêtes par cycle
  const cyclesPerHour = availableRequests / (studentCount * REQUESTS_PER_STUDENT);

  // Intervalle en secondes = nombre de secondes dans une heure / cycles par heure
  const intervalSeconds = Math.ceil(3600 / cyclesPerHour);

  // Retourner au moins l'intervalle de base
  return Math.max(BASE_UPDATE_INTERVAL, intervalSeconds);
};

// Cache des utilisateurs en mémoire pour cette session
const userDataCache: Record<string, { id: number; login: string; image: any }> = {};

// Définir l'interface Student
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

  // Remplacer UPDATE_INTERVAL_SECONDS par BASE_UPDATE_INTERVAL
  const [nextUpdate, setNextUpdate] = useState(BASE_UPDATE_INTERVAL);
  const [showIntervalSlider, setShowIntervalSlider] = useState(false);
  const [customInterval, setCustomInterval] = useState(BASE_UPDATE_INTERVAL);
  const [tempInterval, setTempInterval] = useState(BASE_UPDATE_INTERVAL);

  const nextUpdateRef = useRef(BASE_UPDATE_INTERVAL);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentUpdatingLogin, setCurrentUpdatingLogin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateCycle, setUpdateCycle] = useState(0);
  const { login } = useAuth();
  const [apiCallsCount, setApiCallsCount] = useState(0);
  const [failedStudents, setFailedStudents] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animationDuration, setAnimationDuration] = useState(10000); // 10 secondes en millisecondes
  // Sons
  const [playProgressSound] = useSound('/sounds/progress.mp3', { volume: 0.5 });
  const [playCompletionSound] = useSound('/sounds/completion.mp3', { volume: 0.7 });
  const [playErrorSound] = useSound('/sounds/error.mp3', { volume: 0.6 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const studentsParam = searchParams.get('students');
    if (studentsParam) {
      const studentsList = studentsParam.split(',');
      setStudents(studentsList);

      // Calculer l'intervalle optimal en fonction du nombre d'étudiants
      const optimalInterval = calculateOptimalInterval(studentsList.length);

      // Mettre à jour l'intervalle personnalisé avec la valeur optimale
      setCustomInterval(optimalInterval);
      setTempInterval(optimalInterval);
      setNextUpdate(optimalInterval);

      // Mettre à jour la référence également
      nextUpdateRef.current = optimalInterval;

      console.log(`Nombre d'étudiants: ${studentsList.length}, intervalle optimal: ${optimalInterval}s`);
    }
  }, [searchParams]);

  // Effet pour initialiser le compteur au chargement de la page
  useEffect(() => {
    // Initialiser le compteur avec la nouvelle fonction
    const updateApiCounter = () => {
      setApiCallsCount(getApiCallCount());
    };

    // Initialisation initiale
    setApiCallsCount(initApiCounter());

    // Mettre à jour le compteur à intervalles réguliers
    const updateCountInterval = setInterval(updateApiCounter, 1000);

    return () => clearInterval(updateCountInterval);
  }, []);  // Supprimer apiCallsCount de la dépendance pour éviter les mises à jour inutiles

  // Fonction pour actualiser un étudiant spécifique
  const updateStudentData = useCallback(async (login: string) => {
    try {
      console.log(`🔄 Début de mise à jour pour: ${login}`);
      setCurrentUpdatingLogin(login);

      // Délai artificiel pour s'assurer que le loader s'affiche
      await new Promise(resolve => setTimeout(resolve, 300));

      const studentData = await fetchStudentData(login);
      console.log(`✅ Données récupérées avec succès pour: ${login}`);

      setStudentsData(prevData => {
        const prevStudent = prevData[login];

        // Vérifier si c'est la première récupération de données pour l'étudiant
        const isFirstLoad = !prevStudent;

        // Si ce n'est pas le premier chargement, vérifier la progression et le status
        if (!isFirstLoad) {
          const prevProgress = prevStudent.progress;
          const newProgress = studentData.progress;
          const prevStatus = prevStudent.status;
          const newStatus = studentData.status;

          // Vérifier si la progression a augmenté OU si le statut a changé
          if (newProgress > prevProgress || prevStatus !== newStatus) {
            // Stocker les données précédentes pour référence
            setPreviousProgress(prev => ({
              ...prev,
              [login]: prevProgress
            }));

            // Indiquer que l'étudiant a une progression améliorée ou un changement d'état
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
            }
            // Si le statut est passé à "Réussi", jouer le son de complétion
            else if (newStatus === 'Réussi' && prevStatus !== 'Réussi') {
              playCompletionSound();
            }
            // Si le statut est passé de "En cours" à "Échoué", jouer le son d'erreur
            else if (newStatus === 'Échoué' && prevStatus === 'En cours') {
              // Activer l'animation d'échec
              setFailedStudents(prev => ({
                ...prev,
                [login]: true
              }));

              // Jouer le son d'erreur
              playErrorSound();

              // Désactiver l'animation après la durée configurée
              setTimeout(() => {
                setFailedStudents(prev => ({
                  ...prev,
                  [login]: false
                }));
              }, animationDuration); // Maintenir la durée d'affichage contrôlée par animationDuration
            }
            // Pour tout autre changement, jouer le son de progression
            else {
              // Jouer un son pour l'avancement normal ou changement d'état
              playProgressSound();
            }

            // Réinitialiser l'animation après la durée configurée
            setTimeout(() => {
              setAnimatedStudents(prev => ({
                ...prev,
                [login]: false
              }));
            }, animationDuration);
          }
        }

        return {
          ...prevData,
          [login]: studentData
        };
      });

      return true;
    } catch (err: any) {
      console.error(`❌ ERREUR pour ${login}:`, err);
      const errorMessage = err.message || 'Erreur lors de la mise à jour des données.';
      setError(errorMessage);

      if (err.response && err.response.status === 429) {
        console.warn(`⚠️ Limite de requêtes API atteinte, pause d'une minute`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      return false;
    } finally {
      // Attendre un peu avant de retirer l'indicateur de chargement
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentUpdatingLogin(null);
      console.log(`🏁 Fin de mise à jour pour: ${login}`);
    }
  }, [playProgressSound, playCompletionSound, playErrorSound, completedStudents, animationDuration]);


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

    // Réinitialiser l'animation après la durée configurée
    setTimeout(() => {
      setAnimatedStudents(prev => ({
        ...prev,
        [login]: false
      }));
    }, animationDuration);
  }, [playCompletionSound, animationDuration]);

  // Test caché pour déclencher l'animation de progression sans affecter les données
  const triggerProgressAnimation = useCallback((login: string) => {
    // Jouer le son de progression
    playProgressSound();

    // Activer l'animation sur la carte
    setAnimatedStudents(prev => ({
      ...prev,
      [login]: true
    }));

    // Réinitialiser l'animation après la durée configurée
    setTimeout(() => {
      setAnimatedStudents(prev => ({
        ...prev,
        [login]: false
      }));
    }, animationDuration);
  }, [playProgressSound, animationDuration]);

  // Test caché pour déclencher l'animation d'échec sans affecter les données
  const triggerFailureAnimation = useCallback((login: string) => {
    // Activer l'animation d'échec
    setFailedStudents(prev => ({
      ...prev,
      [login]: true
    }));

    // Jouer le son d'erreur
    playErrorSound();

    // Désactiver l'animation après la durée configurée
    setTimeout(() => {
      setFailedStudents(prev => ({
        ...prev,
        [login]: false
      }));
    }, animationDuration); // Modifié de 5000 à 8000 ms
  }, [playErrorSound, animationDuration]);

  // En cas d'erreur d'authentification, proposer de se reconnecter
  const handleReconnect = () => {
    login(); // Utiliser la fonction login du AuthProvider
  };

  // Effet pour mettre à jour l'heure chaque minute
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(clockInterval);
  }, []);

  // Fonction pour formater l'heure
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="main-container">
      {/* Composant de confettis qui sera activé lors d'un accomplissement */}
      <Confetti active={showConfetti} />

      <header className="modern-header">
        <div className="header-content">
          <div className="header-brand">
            <Link href="/" className="brand-link">
              <div className="brand-logo">42</div>
              <h1 className="brand-title">Eval Viewer</h1>
            </Link>
          </div>

          <div className="header-controls">
            <div className="clock-display">
              <ClockIcon className="clock-icon" />
              <span className="clock-time">{formatTime(currentTime)}</span>
            </div>

            <div className="refresh-control">
              <div
                className="countdown-badge"
                onClick={() => setShowIntervalSlider(!showIntervalSlider)}
                title="Cliquez pour configurer l'intervalle"
              >
                <span className="countdown-value">{nextUpdate}</span>
                <span className="countdown-label">s</span>
              </div>

              {/* Suppression du bouton de rafraîchissement forcé */}

              {showIntervalSlider && (
                <div className="interval-popover">
                  <div className="interval-header">
                    Fréquence d'actualisation
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                      Recommandé: {calculateOptimalInterval(students.length)}s pour {students.length} étudiant{students.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={MIN_UPDATE_INTERVAL}
                    max={MAX_UPDATE_INTERVAL}
                    value={tempInterval}
                    onChange={handleIntervalChange}
                    onMouseUp={handleIntervalChangeEnd}
                    onTouchEnd={handleIntervalChangeEnd}
                    className="interval-slider"
                  />
                  <div className="interval-footer">
                    <span className="interval-value">{tempInterval} secondes</span>
                  </div>
                </div>
              )}
            </div>

            <div className="api-badge" title="Nombre total de requêtes API">
              <span className="api-value">{apiCallsCount}</span>
              <span className="api-label">API</span>
            </div>
          </div>
        </div>
      </header>

      <div className="content-area">
        <div className="students-grid">
          {students.map(login => {
            const studentData = studentsData[login];
            const isAnimated = animatedStudents[login];
            const isFailed = failedStudents[login];
            const isUpdating = currentUpdatingLogin === login;

            // Si nous n'avons pas encore les données de cet étudiant, afficher un squelette
            if (!studentData) {
              return <StudentCardSkeleton key={`skeleton-${login}`} login={login} />;
            }

            // Sinon, afficher la carte avec les données de l'étudiant
            return (
              <div
                key={studentData.id}
                className={`student-card ${isAnimated ? 'card-bounce rainbow-shadow' : ''} ${isFailed ? 'failure-shadow' : ''}`}
                onDoubleClick={() => {
                  // Gardez uniquement la fonction de mise à jour et supprimez le nettoyage du cache
                  updateStudentData(login);
                }}
                title="Double-cliquez pour actualiser les données"
              >
                {isUpdating && (
                  <div
                    className="loading-indicator"
                    title="Actualisation des données en cours..."
                  >
                    <div className="loader-dots">
                      <div className="loader-dot"></div>
                      <div className="loader-dot"></div>
                      <div className="loader-dot"></div>
                    </div>
                  </div>
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
                    <span
                      className="progress-label"
                      onClick={() => triggerFailureAnimation(studentData.login)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquez pour tester l'animation d'échec"
                    >
                      Progression
                    </span>
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
    </div>
  );
}