FROM node:22-alpine AS base

# -- Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -- builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# La única NEXT_PUBLIC_* que usa la app. Va como build arg porque Next la
# reemplaza por su valor en tiempo de build, también del lado del servidor:
# no se puede cambiar después inyectándola al contenedor. Por eso staging y
# producción necesitan builds distintos y no pueden compartir la imagen.
#
# Las de Supabase se sacaron en la migración a infra propia: nada las lee.
# El resto de la configuración (DATABASE_URL, BETTER_AUTH_*, SMTP_*) es de
# runtime y se inyecta al correr el contenedor, no acá.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# -- runner 
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
