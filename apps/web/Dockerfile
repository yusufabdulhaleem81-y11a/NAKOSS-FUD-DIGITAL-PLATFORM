# ── NAKOSS Digital API ──
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace apps/api
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 8080
CMD ["npx", "tsx", "src/index.ts"]