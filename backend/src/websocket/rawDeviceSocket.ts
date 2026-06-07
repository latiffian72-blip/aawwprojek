import { WebSocketServer, WebSocket } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { pgClient, redisClient } from '../config/database';

const rawClients = new Map<string, WebSocket>();

export const getRawDeviceClient = (deviceId: string): WebSocket | undefined => {
  return rawClients.get(deviceId);
};

export const setupRawWebSocket = (httpServer: any, io: SocketIOServer) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request: any, socket: any, head: any) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname !== '/ws') return;

    const deviceId = url.searchParams.get('device_id');
    if (!deviceId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      console.log(`✅ [RAW] Device ${deviceId} terhubung via WebSocket`);
      rawClients.set(deviceId, ws);

      pgClient.query(
        'UPDATE devices SET status = $1, last_heartbeat = NOW() WHERE id = $2',
        ['ONLINE', deviceId]
      ).catch(e => console.error(e));

      redisClient.setEx(`device:${deviceId}:status`, 300, 'ONLINE').catch(e => console.error(e));

      io.emit('device_heartbeat', { device_id: deviceId, status: 'ONLINE' });

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'sensor_data': {
              io.emit('sensor_update', message);

              if (message.readings && Array.isArray(message.readings)) {
                for (const reading of message.readings) {
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
              break;
            }

            case 'status_update':
              io.emit('device_status', { device_id: deviceId, ...message });
              break;

            case 'heartbeat':
              pgClient.query('UPDATE devices SET last_heartbeat = NOW() WHERE id = $1', [deviceId]).catch(console.error);
              redisClient.setEx(`device:${deviceId}:status`, 300, 'ONLINE').catch(console.error);
              break;
          }
        } catch (err) {
          console.error('❌ [RAW] Gagal parse pesan:', err);
        }
      });

      ws.on('close', () => {
        console.log(`❌ [RAW] Device ${deviceId} terputus`);
        rawClients.delete(deviceId);
        pgClient.query('UPDATE devices SET status = $1 WHERE id = $2', ['OFFLINE', deviceId]).catch(console.error);
        io.emit('device_heartbeat', { device_id: deviceId, status: 'OFFLINE' });
      });

      ws.on('error', (err) => {
        console.error(`⚠️ [RAW] Error WS ${deviceId}:`, err.message);
      });
    });
  });
};
