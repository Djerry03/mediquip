# syntax=docker/dockerfile:1

# --- Étape 1 : compilation ------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --legacy-peer-deps --workspace apps/web --include-workspace-root

COPY apps/web apps/web

# Les variables NEXT_PUBLIC_* sont inlinées à la compilation : elles doivent
# donc être fournies au build, pas seulement au démarrage du conteneur.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_TELEMETRY_DISABLED=1

RUN npm --workspace apps/web run build

# --- Étape 2 : image finale ----------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /repo/apps/web

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache dumb-init

COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/apps/web/.next ./.next
COPY --from=builder /repo/apps/web/public ./public
COPY --from=builder /repo/apps/web/package.json ./package.json
COPY --from=builder /repo/apps/web/next.config.js ./next.config.js

USER node
EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3004/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node_modules/.bin/next", "start", "-p", "3004"]
