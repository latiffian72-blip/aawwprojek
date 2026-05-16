# Menggunakan sistem operasi dasar yang sangat ringan (Alpine Linux) dengan Node.js 18
FROM node:18-alpine

# Mengatur folder kerja di dalam container Docker
WORKDIR /app

# Menyalin file daftar pustaka (library) terlebih dahulu
# Jika file belum ada (misal proyek belum di-init), langkah ini aman
COPY package*.json ./

# Menginstal pustaka yang dibutuhkan
RUN npm install || echo "Melewati install karena package.json belum lengkap"

# Menyalin seluruh file backend ke dalam container
COPY . .

# Membuka port komunikasi untuk Backend
EXPOSE 3001

# Perintah untuk menjalankan backend saat container dinyalakan
CMD ["npm", "run", "dev"]
