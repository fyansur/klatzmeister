# ---------- build frontend (VITE_* dari .env ke-bake ke bundle di sini) ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- image akhir: server cuma pake modul bawaan node, nggak butuh node_modules ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY server ./server
COPY --from=build /app/dist ./dist
EXPOSE 4002
CMD ["node", "server/index.ts"]
