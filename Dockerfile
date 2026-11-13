# Stage 1: Build frontend & PWA assets
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

COPY . .
RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Stage 2: Minimal production runtime (only Express + dotenv)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=256"

RUN npm install --no-save --omit=dev express@^4.21.2 dotenv@^17.2.3 && npm cache clean --force

COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY server.ts ./
COPY server ./server

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.ts"]
