# Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY index.html vite.config.* tsconfig*.json ./
COPY src ./src
COPY public ./public
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# API runtime (serves built UI in production)
FROM node:20-alpine AS api
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/package-lock.json* ./server/
RUN npm ci --ignore-scripts && npm ci --prefix server
COPY server ./server
COPY prisma ./prisma
COPY scripts ./scripts
RUN npx prisma generate --schema prisma/schema.postgresql.prisma \
  && npm run build --prefix server
COPY --from=frontend /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "scripts/start-prod.mjs"]
