
![42 Eval Follow](https://i.imgur.com/3uiQvoQ.png)

Une application web moderne permettant de suivre en temps réel la progression des étudiants de 42 lors de leurs examens.

## 🌟 Fonctionnalités

- **Authentification avec l'API 42** - Connexion sécurisée via OAuth
- **Suivi en temps réel** - Mise à jour automatique des données avec intervalle configurable
- **Sélection d'examens** - Choix facile parmi les examens en cours
- **Recherche d'étudiants** - Recherche rapide par login
- **Historique des sessions** - Sauvegarde automatique des groupes d'étudiants suivis
- **Notifications visuelles et sonores** - Alertes lors des changements de progression
- **Mode sombre/clair** - Interface adaptée à vos préférences
- **Interface responsive** - Fonctionne sur tous les appareils

## 🛠️ Technologies utilisées

- **Frontend**: Next.js 15, React 19, TypeScript
- **State management**: React Context API, React Query
- **Styles**: CSS variables, classes modulaires
- **Animations**: Canvas Confetti, CSS animations
- **Docker**: Conteneurisation pour un déploiement facile
- **CI/CD**: GitHub Actions

## 🚀 Installation et configuration

### Prérequis

- Node.js 18+ (19 recommandé)
- npm ou yarn
- Clés API de 42 (Client ID et Secret)

### Installation locale

1. **Cloner le répertoire**

```bash
git clone https://github.com/votre-username/42_eval_viewer.git
cd 42_eval_viewer
```

2. **Installer les dépendances**

```bash
npm install
# ou
yarn install
```

3. **Configurer les variables d'environnement**

```bash
cp .env.example .env.local
```

Éditez le fichier `.env.local` avec vos informations:

## 🐋 Déploiement avec Docker

### Variables d'environnement requises

| Variable | Description | Valeur par défaut |
| --- | --- | --- |
| `NEXT_PUBLIC_DOMAIN` | Domaine de l'application | localhost |
| `PORT` | Port d'écoute de l'application | 3000 |
| `NEXT_PUBLIC_42_CLIENT_ID` | Identifiant client OAuth 42 | - |
| `NEXT_PUBLIC_42_CLIENT_SECRET` | Clé secrète OAuth 42 | - |
| `NEXT_PUBLIC_42_REDIRECT_URI` | URL de redirection OAuth | http://{DOMAIN}:{PORT}/api/auth/callback |

### Déploiement avec Docker Compose

1. **Créez un fichier `.env` à la racine du projet avec vos variables**

```bash
# Configuration du domaine
NEXT_PUBLIC_DOMAIN=votre-domaine.com
PORT=3000

# Configuration API 42
NEXT_PUBLIC_42_CLIENT_ID=votre-client-id-42
NEXT_PUBLIC_42_CLIENT_SECRET=votre-secret-42
NEXT_PUBLIC_42_REDIRECT_URI=https://votre-domaine.com/api/auth/callback
```

2. **Exécutez la commande Docker Compose**

```bash
docker-compose up -d
```

L'application sera accessible à l'adresse: http://votre-domaine.com:3000

### Volumes et persistance des données

Le déploiement Docker utilise deux volumes pour la persistance:

| Volume | Description |
| --- | --- |
| `42_eval_data` | Cache de l'application Next.js |
| `42_eval_local_storage` | Stockage local pour les données de l'application |

### Déploiement manuel avec Docker

Si vous préférez utiliser Docker sans Compose:

```bash
docker build -t 42_eval_viewer .

docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_DOMAIN=votre-domaine.com \
  -e NEXT_PUBLIC_42_CLIENT_ID=votre-client-id-42 \
  -e NEXT_PUBLIC_42_CLIENT_SECRET=votre-secret-42 \
  -e NEXT_PUBLIC_42_REDIRECT_URI=https://votre-domaine.com/api/auth/callback \
  -v 42_eval_data:/app/.next/cache \
  -v 42_eval_local_storage:/app/.local-storage \
  --restart unless-stopped \
  --name 42_eval_viewer \
  42_eval_viewer
```

### Utilisation de l'image prédéfinie

Vous pouvez également utiliser l'image prête à l'emploi depuis GitHub Container Registry:

```bash
docker pull ghcr.io/eliamd/42examfollow:latest

docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_DOMAIN=votre-domaine.com \
  -e NEXT_PUBLIC_42_CLIENT_ID=votre-client-id-42 \
  -e NEXT_PUBLIC_42_CLIENT_SECRET=votre-secret-42 \
  -e NEXT_PUBLIC_42_REDIRECT_URI=https://votre-domaine.com/api/auth/callback \
  -v 42_eval_data:/app/.next/cache \
  -v 42_eval_local_storage:/app/.local-storage \
  --name 42_eval_viewer \
  ghcr.io/eliamd/42examfollow:latest
```
