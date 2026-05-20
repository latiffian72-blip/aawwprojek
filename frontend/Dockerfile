# Template standar untuk Next.js (Multi-stage build)

# Tahap 1: Install Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN (npm ci || npm install || echo "Melewati install karena package.json belum lengkap") && mkdir -p /app/node_modules

# Tahap 2: Builder (Jika Anda sudah siap ke tahap produksi, uncomment baris-baris ini)
# FROM node:18-alpine AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# RUN npm run build

# Tahap 3: Runner (Sistem yang akan berjalan)
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV development
# Jika produksi: ENV NODE_ENV production
ENV PORT 3000

# Untuk sementara kita jalankan dalam mode dev karena Next.js belum ada
# Nanti jika sudah di-build, gunakan node server.js (standalone)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
