# Utiliser l'image officielle Node.js comme base
FROM node:19-alpine AS base

# Définir le répertoire de travail
WORKDIR /app

# Étape de dépendances
FROM base AS dependencies
# Copier package.json et package-lock.json
COPY package*.json ./
# Installer les dépendances
RUN npm ci

# Étape de construction
FROM dependencies AS builder
# Copier tous les fichiers du projet
COPY . .
# Construire l'application avec l'option --no-lint pour ignorer les erreurs ESLint
RUN npm run build -- --no-lint

# Étape de production
FROM base AS runner
# Définir les variables d'environnement pour la production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Créer un utilisateur non-root pour plus de sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires depuis l'étape de construction
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Changer pour l'utilisateur non-root
USER nextjs

# Exposer le port sur lequel l'application sera disponible
EXPOSE 3000

# Définir la commande pour démarrer l'application
CMD ["node", "server.js"]
