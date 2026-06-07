import { Server, Socket } from 'socket.io';
import { pgClient, redisClient } from '../config/database';
import { getRawDeviceClient } from './rawDeviceSocket';

export const initializeWebSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    const deviceId = socket.handshake.query.device_id as string;

    if (deviceId) {
      // 1. KONEKSI DARI ESP32
      console.log(`✅ Device ${deviceId} terhubung`);
      socket.join(`device:${deviceId}`);

      // Update status di PostgreSQL & Redis
      pgClient.query(
        'UPDATE devices SET status = $1, last_heartbeat = NOW() WHERE id = $2',
        ['ONLINE', deviceId]
      ).catch(e => console.error(e));
      
      redisClient.setEx(`device:${deviceId}:status`, 300, 'ONLINE').catch(e => console.error(e));

      // Beritahu frontend bahwa alat online
      io.emit('device_heartbeat', { device_id: deviceId, status: 'ONLINE' });

      // Menerima data sensor dari ESP32
      socket.on('sensor_data', async (data) => {
        // Broadcast ke frontend
        io.emit('sensor_update', data);

        // Simpan ke PostgreSQL
        if (data.readings && Array.isArray(data.readings)) {
          for (const reading of data.readings) {
            try {
              await pgClient.query(
                'INSERT INTO sensor_readings (device_id, sensor_type, sensor_value, unit) VALUES ($1, $2, $3, $4)',
                [deviceId, reading.type, reading.value, reading.unit]
              );
            } catch (error) {
              console.error('Gagal menyimpan data sensor:', error);
            }
          }
        }
      });

      // Menerima status pompa/blower
      socket.on('status_update', async (data) => {
        io.emit('device_status', { device_id: deviceId, ...data });
      });

      // Heartbeat
      socket.on('heartbeat', () => {
         pgClient.query('UPDATE devices SET last_heartbeat = NOW() WHERE id = $1', [deviceId]).catch(console.error);
         redisClient.setEx(`device:${deviceId}:status`, 300, 'ONLINE').catch(console.error);
      });

      socket.on('disconnect', () => {
        console.log(`❌ Device ${deviceId} terputus`);
        pgClient.query('UPDATE devices SET status = $1 WHERE id = $2', ['OFFLINE', deviceId]).catch(console.error);
        io.emit('device_heartbeat', { device_id: deviceId, status: 'OFFLINE' });
      });

    } else {
      // 2. KONEKSI DARI WEBSITE FRONTEND
      console.log(`🖥️ Dashboard web terhubung: ${socket.id}`);

      // Menerima perintah dari web untuk diteruskan ke ESP32
      socket.on('control_device', async (data) => {
        const { device_id, command, payload } = data;
        console.log(`🎮 Perintah dari Web untuk ${device_id}: ${command}`);

        try {
           const result = await pgClient.query(
             'INSERT INTO command_queue (device_id, command, payload) VALUES ($1, $2, $3) RETURNING *',
             [device_id, command, JSON.stringify(payload || {})]
           );

           // Teruskan pesan WebSocket langsung ke ESP32 (Socket.IO rooms)
           const cmdObj = {
             id: result.rows[0].id,
             command,
             payload
           };
           io.to(`device:${device_id}`).emit('command', cmdObj);

           // Juga kirim via raw WebSocket (ESP32 pakai WebSocketsClient)
           const rawClient = getRawDeviceClient(device_id);
           if (rawClient && rawClient.readyState === 1) {
             rawClient.send(JSON.stringify(cmdObj));
           }
        } catch (error) {
           console.error('Gagal mengirim perintah:', error);
        }
      });
    }
  });
};
