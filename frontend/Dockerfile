
# Stage 1 - Dependencies
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install

# Stage 2 - Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Terima ARG saat docker build (diperlukan karena NEXT_PUBLIC_* di-bake saat build)
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 3 - Production Runner
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

ENV PORT=3000

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]