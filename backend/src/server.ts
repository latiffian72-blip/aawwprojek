import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import apiRoutes from './routes/api';
import { initializeWebSocket } from './websocket/socketHandler';
import { setupRawWebSocket } from './websocket/rawDeviceSocket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' } // Di production, pastikan diisi dengan domain Frontend Anda
});

// Middleware
app.use(express.json());
app.use(cors());

// Mendaftarkan URL API
app.use('/api', apiRoutes);

// Menginisialisasi WebSocket
initializeWebSocket(io);
setupRawWebSocket(httpServer, io);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  // Tunggu koneksi database berhasil sebelum menyalakan server
  await connectDB();
  
  httpServer.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`📡 WebSocket siap menerima koneksi`);
    console.log(`========================================\n`);
  });
};

startServer();
