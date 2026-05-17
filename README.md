# ASAP MONITOR - Panduan Lengkap Penggunaan

Selamat datang di sistem **ASAP MONITOR**! Ini adalah platform _Internet of Things_ (IoT) berbasis _Real-Time_ yang dirancang untuk memantau kualitas udara, kekeruhan air, dan mengontrol perangkat (Pompa & Blower) dari jarak jauh.

Dokumen ini berisi panduan teknis langkah demi langkah untuk menyalakan sistem ini dari nol, baik untuk tahap simulasi (pengembangan) maupun untuk koneksi ke alat fisik (ESP32).

---

## Struktur Arsitektur Sistem

Proyek ini terdiri dari 4 pilar utama:

1. **Database & Cache**: PostgreSQL (menyimpan data historis) & Redis (menjaga status perangkat).
2. **Backend**: Server Node.js yang bertugas sebagai _jembatan_ WebSocket antara Alat dan Web.
3. **Frontend**: Dashboard Next.js modern (_App Router_) yang super interaktif.
4. **Node/Hardware**: Alat fisik ESP32 (atau Simulator Node.js) yang mengirimkan data sensor.

---

## Persyaratan Sistem

Pastikan komputer Anda sudah terinstal perangkat lunak berikut:

- **Node.js** (versi 18 atau lebih baru)
- **Docker & Docker Compose** (wajib untuk menyalakan database)
- **Arduino IDE** (hanya jika Anda ingin memprogram ESP32 asli)

---

## CARA MENYALAKAN SISTEM (STEP-BY-STEP)

Silakan ikuti urutan ini dengan teliti. Anda perlu membuka **3 tab Terminal** yang berbeda untuk menyalakan komponen-komponennya secara bersamaan.

### LANGKAH 1: Menyalakan Database (PostgreSQL & Redis)

Sistem tidak akan bisa menyala tanpa _database_. Kita akan menggunakan Docker agar Anda tidak perlu menginstal _database_ secara manual.

1. Buka Terminal pertama, masuk ke direktori utama proyek:
   ```bash
   cd aawwprojek
   ```
2. Jalankan perintah Docker ini untuk menghidupkan _database_ di latar belakang:
   ```bash
   sudo docker compose up -d postgres redis
   ```
   _(Sistem PostgreSQL akan menyala di port `5432` dan Redis di port `6379`)_.

---

### LANGKAH 2: Menyalakan Backend Server (Otak Sistem)

_Backend_ bertugas menerima data dari alat dan meneruskannya ke layar monitor Web.

1. Buka **Terminal Kedua**, masuk ke folder _backend_:
   ```bash
   cd aawwprojek/backend
   ```
2. Pastikan paket sudah terinstal:
   ```bash
   npm install
   ```
3. Nyalakan server:
   ```bash
   npm run dev
   ```
   *(Backend akan menyala dan *standby* di **http://localhost:3001**)*.

---

### LANGKAH 3: Menyalakan Frontend (Dashboard Web)

Sekarang kita nyalakan tampilan cantiknya (Next.js).

1. Buka **Terminal Ketiga**, masuk ke folder _frontend_:
   ```bash
   cd aawwprojek/frontend
   ```
2. Pastikan paket Next.js terinstal:
   ```bash
   npm install
   ```
3. Nyalakan mesin tampilan Web:
   ```bash
   npm run dev
   ```
4. Buka _browser_ Anda dan kunjungi: **http://localhost:3000**
   _(Anda akan melihat layar Dashboard, namun statusnya masih OFFLINE dan angka 0)_.

---

### LANGKAH 4: Menyalakan Node (Simulator ESP32)

Agar grafik di layar bergerak, kita butuh "alat palsu" yang mengirim data sensor.

1. Buka **Terminal Keempat** (terakhir), masuk ke folder _backend_:
   ```bash
   cd aawwprojek/backend
   ```
2. Jalankan skrip simulator perangkat keras:
   ```bash
   node simulator-esp32.js
   ```
3. **Selesai!** Coba lirik _browser_ Anda, indikator di web akan berubah menjadi **SYSTEM ONLINE (Hijau)** dan grafik perlahan-lahan mulai bergerak mengikuti data palsu dari simulator!

---

## MENGHUBUNGKAN KE HARDWARE ASLI (ESP32)

Jika Anda sudah siap meninggalkan simulator dan ingin menggunakan ESP32 sungguhan:

1. **Matikan Simulator**: Di Terminal Keempat, tekan `Ctrl + C` untuk mematikan `simulator-esp32.js`.
2. Buka _file_ **`esp32/esp32-firmware-skeleton.ino`** menggunakan **Arduino IDE**.
3. Di bagian paling atas kode, cari tulisan berikut dan sesuaikan dengan WiFi rumah Anda:
   ```cpp
   const char* ssid = "NAMA_WIFI_ANDA";
   const char* password = "PASSWORD_WIFI";
   ```
4. Ubah `SOCKET_SERVER` menjadi alamat IP komputer tempat _Backend_ (Langkah 2) berjalan. Misalnya, jika IP komputer/laptop Anda adalah `192.168.1.15`, maka:
   ```cpp
   const char* SOCKET_SERVER = "ws://192.168.1.15:3001";
   ```
5. Unggah (_Upload_) kode tersebut ke papan ESP32 Anda.
6. Begitu ESP32 berhasil terhubung ke WiFi, ia akan langsung terkoneksi ke _Backend_, dan Anda akan melihat data dari **Sensor Asli** bermunculan di _Dashboard_ Web Anda!

---

> **Catatan Tambahan:** Jika Anda ingin mengakses web ini dari luar rumah (internet), Anda bisa menggunakan Ngrok di folder _frontend_ dengan perintah `ngrok http 3000`. Pastikan jangan membagikan _link_ sembarangan karena sistem belum dipasangi pelindung _Login_.
