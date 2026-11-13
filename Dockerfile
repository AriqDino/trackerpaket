# Stage 1: Build frontend & PWA assets
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --legacy-peer-deps; else npm install --omit=dev --legacy-peer-deps; fi && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY server.ts ./
COPY server ./server

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.ts"]
