import axios from 'axios';

// Constantes pour la gestion des retries
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 secondes

// Tableau d'ordre des examens du plus ancien au plus récent
export const EXAM_ORDER = [
  "C Piscine Exam 00",
  "C Piscine Exam 01",
  "C Piscine Exam 02",
  "C Piscine Final Exam",
  "Exam Rank 02",
  "Exam Rank 03",
  "Exam Rank 04",
  "Exam Rank 05",
  "Exam Rank 06"
];

// Fonction pour déterminer si un projet est un examen
export function isExam(projectName: string): boolean {
  return projectName.includes("Exam Rank") ||
         projectName.includes("C Piscine Exam") ||
         projectName === "C Piscine Final Exam";
}

// Fonction pour obtenir la valeur d'ordre d'un examen (plus grand = plus récent)
export function getExamOrder(examName: string): number {
  const index = EXAM_ORDER.findIndex(name => examName.includes(name));
  return index === -1 ? -1 : index;
}

// Cache des utilisateurs pour éviter des requêtes répétées
const userDataCache: Record<string, { id: number; login: string; image: any }> = {};

// La structure du cache pour les projets est conservée mais ne sera plus utilisée
const projectsCache: Record<string, { data: any, timestamp: number }> = {};

// Réduire drastiquement la durée du cache des projets pour permettre des actualisations plus fréquentes
const CACHE_DURATION = 30 * 1000; // 30 secondes au lieu de 5 minutes

// Variable globale pour compter les requêtes API
let totalApiCalls = 0;

/**
 * Vérifie si l'heure a changé depuis la dernière requête API
 * et réinitialise le compteur si nécessaire
 */
function resetApiCounterIfHourChanged() {
  if (typeof window === "undefined") return;

  const now = new Date();
  const currentHour = now.getHours();

  // Récupérer la dernière heure enregistrée
  const lastHourStr = localStorage.getItem('42_api_last_hour');

  // S'il n'y a pas d'heure enregistrée, l'enregistrer maintenant
  if (!lastHourStr) {
    localStorage.setItem('42_api_last_hour', currentHour.toString());
    return;
  }

  const lastHour = parseInt(lastHourStr, 10);

  // Si l'heure a changé, réinitialiser le compteur
  if (currentHour !== lastHour) {
    console.log(`Nouvelle heure détectée (${currentHour}h), réinitialisation du compteur API`);
    totalApiCalls = 0;
    localStorage.setItem('42_api_calls_count', '0');
    localStorage.setItem('42_api_last_hour', currentHour.toString());
  }
}

export function formatDate(dateString: string): string {
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

export function getStatusClass(status: string): string {
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

export function getProgressClass(status: string): string {
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
export async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  try {
    // Vérifier si l'heure a changé et réinitialiser le compteur si nécessaire
    resetApiCounterIfHourChanged();

    // Incrémenter le compteur de requêtes API à chaque appel
    totalApiCalls++;
    if (typeof window !== "undefined") {
      // Mettre à jour le compteur dans localStorage pour conserver la valeur entre les rechargements
      window.localStorage.setItem('42_api_calls_count', totalApiCalls.toString());
    }

    // Utiliser notre API proxy pour éviter les problèmes CORS
    const proxyUrl = url.replace('https://api.intra.42.fr/v2/', '/api/proxy/');
    return await axios(proxyUrl, options);
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

export async function fetchStudentData(login: string): Promise<any> {
  const token = localStorage.getItem('42_access_token');
  if (!token) {
    console.error('❌ Erreur: Token d\'authentification non trouvé');
    window.location.href = '/';
    throw new Error('Non authentifié');
  }

  console.log(`🔄 Début de la récupération des données pour ${login}`);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  };

  try {
    // Garder le cache pour les données utilisateur
    let userData = userDataCache[login];
    if (!userData) {
      console.log(`📡 Requête API: Données utilisateur pour ${login}`);
      const userResponse = await fetchWithRetry(
        `https://api.intra.42.fr/v2/users/${login}`,
        authHeaders
      );
      userData = {
        id: userResponse.data.id,
        login: userResponse.data.login,
        image: userResponse.data.image
      };
      console.log(`✅ Données utilisateur pour ${login} récupérées avec succès`);
      userDataCache[login] = userData;
    } else {
      console.log(`💾 Utilisation du cache pour les données utilisateur de ${login}`);
    }

    // Toujours récupérer les dernières données de projet depuis l'API sans utiliser le cache
    console.log(`📡 Requête API: Projets pour ${login}`);
    const projectsResponse = await fetchWithRetry(
      `https://api.intra.42.fr/v2/users/${login}/projects_users`,
      authHeaders
    );
    const projectsData = projectsResponse.data;
    console.log(`✅ Projets pour ${login} récupérés avec succès (${projectsData.length} projets)`);

    // Filtrer les examens en utilisant la fonction isExam
    const examAttempts = projectsData.filter((project: any) => {
      const projectName = project.project.name;
      const isExamProject = isExam(projectName);
      return isExamProject;
    });

    console.log(`🧪 ${examAttempts.length} examens trouvés pour ${login}`);

    // Trouver la tentative la plus récente en regardant dans toutes les équipes
    let lastExamAttempt = null;
    let mostRecentDate = new Date(0); // Date initiale très ancienne
    let highestExamOrder = -1; // Pour conserver l'examen le plus avancé

    for (const attempt of examAttempts) {
      if (attempt.teams && attempt.teams.length > 0) {
        // Parcourir toutes les équipes de la tentative
        for (const team of attempt.teams) {
          const teamDate = new Date(team.updated_at);
          const examOrder = getExamOrder(attempt.project.name);

          // Priorité 1: examen plus avancé dans l'ordre
          // Priorité 2: si même niveau d'examen, prendre la date la plus récente
          if (examOrder > highestExamOrder ||
              (examOrder === highestExamOrder && teamDate > mostRecentDate)) {
            mostRecentDate = teamDate;
            highestExamOrder = examOrder;
            lastExamAttempt = {
              ...attempt,
              team: team,
              examOrder: examOrder // Ajouter l'ordre de l'examen pour référence
            };
          }
        }
      }
    }

    let progress = 0;
    let status = 'non commencé';
    let currentExam = '';

    if (lastExamAttempt) {
      currentExam = lastExamAttempt.project.name;
      progress = lastExamAttempt.team.final_mark || 0;
      status = lastExamAttempt.team["validated?"] ? 'Réussi' :
               lastExamAttempt.team.status === 'finished' ? 'Échoué' :
               lastExamAttempt.team.status === 'in_progress' ? 'En cours' : 'non commencé';

      console.log(`📊 Résultat pour ${login}: ${currentExam} - ${progress}% - ${status}`);
    } else {
      console.log(`ℹ️ Aucun examen trouvé pour ${login}`);
    }

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
    console.error(`❌ Erreur lors de la récupération des données pour ${login}:`, error);

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

// Ces fonctions peuvent rester même si elles ne sont plus utilisées directement
export function clearStudentCache(login: string): void {
  const cacheKey = `projects_${login}`;
  if (projectsCache[cacheKey]) {
    delete projectsCache[cacheKey];
    console.log(`🧹 Cache effacé pour ${login}`);
  }
}

export function clearAllCache(): void {
  Object.keys(projectsCache).forEach(key => {
    delete projectsCache[key];
  });
  console.log(`🧹 Cache des projets entièrement effacé`);
}

/**
 * Initialise le compteur API depuis le localStorage et vérifie si l'heure a changé
 * @returns Le nombre actuel d'appels API
 */
export function initApiCounter(): number {
  if (typeof window === "undefined") return 0;

  const savedCount = localStorage.getItem('42_api_calls_count');
  if (savedCount) {
    totalApiCalls = parseInt(savedCount);
  } else {
    // Si pas de valeur sauvegardée, initialiser à 0
    localStorage.setItem('42_api_calls_count', '0');
  }

  // Ajouter l'heure actuelle si elle n'existe pas encore
  if (!localStorage.getItem('42_api_last_hour')) {
    const currentHour = new Date().getHours();
    localStorage.setItem('42_api_last_hour', currentHour.toString());
  }

  // Vérifier si l'heure a changé et réinitialiser si nécessaire
  resetApiCounterIfHourChanged();

  return totalApiCalls;
}

/**
 * Retourne le nombre actuel d'appels API
 */
export function getApiCallCount(): number {
  // Vérifie aussi si l'heure a changé avant de renvoyer le compteur
  resetApiCounterIfHourChanged();
  return totalApiCalls;
}
