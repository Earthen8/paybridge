FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY backend/prisma ./backend/prisma

RUN npm ci

COPY backend ./backend
COPY frontend ./frontend

RUN npm run db:generate && npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run db:push && npm run db:seed && npm run start --workspace=backend"]
