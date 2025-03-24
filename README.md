# 42 Eval Viewer

![42 Eval Viewer](https://via.placeholder.com/1200x600?text=42+Eval+Viewer)

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
