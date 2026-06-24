FROM node:20-bookworm-slim AS web-builder

WORKDIR /app/apps/web

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web/ ./
ARG REACT_APP_API_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM node:20-bookworm-slim AS api-deps

WORKDIR /app/apps/api

COPY apps/api/package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

COPY --from=api-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY --from=web-builder /app/apps/web/build ./apps/api/public

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "server.js"]
