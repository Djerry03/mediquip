# syntax=docker/dockerfile:1

# --- Étape 1 : dépendances et compilation -------------------------------
FROM node:22-alpine AS builder
WORKDIR /repo

# Les manifests d'abord : la couche d'installation est mise en cache tant
# que les dépendances ne changent pas.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --legacy-peer-deps --workspace apps/api --include-workspace-root

COPY apps/api apps/api
RUN npm --workspace apps/api run build

# --- Étape 2 : dépendances de production seules --------------------------
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --legacy-peer-deps --omit=dev --workspace apps/api --include-workspace-root

# --- Étape 3 : image finale ----------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /repo/apps/api

ENV NODE_ENV=production

# `dumb-init` assure la propagation de SIGTERM : l'API doit fermer ses
# connexions proprement, pas être tuée à froid par l'orchestrateur.
RUN apk add --no-cache dumb-init

COPY --from=deps /repo/node_modules /repo/node_modules
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./package.json

# Les ordonnances déposées par les clients atterrissent ici : à monter sur
# un volume persistant, sinon elles disparaissent au redéploiement.
RUN mkdir -p /repo/apps/api/uploads && chown -R node:node /repo/apps/api/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/products').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
