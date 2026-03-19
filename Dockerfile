# Stage 1: Build frontend
FROM node:20-alpine AS frontend

WORKDIR /frontend
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm install
COPY dashboard/ .
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend

WORKDIR /app
COPY apps/api/package.json apps/api/package-lock.json* ./
COPY apps/api/prisma ./prisma/
RUN npm install
RUN npx prisma generate
COPY apps/api/ .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine

WORKDIR /app
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/package.json ./
COPY --from=backend /app/prisma ./prisma
COPY --from=frontend /frontend/dist ./public

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
