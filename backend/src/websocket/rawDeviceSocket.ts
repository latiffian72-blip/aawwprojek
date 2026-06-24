import { WebSocketServer, WebSocket } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { pgClient, redisClient } from '../config/database';

const rawClients = new Map<string, WebSocket>();

export const getRawDeviceClient = (deviceId: string): WebSocket | undefined => {
  return rawClients.get(deviceId);
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSER FORMAT FIRMWARE OWNER
// Mengkonversi flat JSON dari main_firmware.ino → format readings array standar
// Contoh input: { "pm25_ctrl":12, "co":3.5, "blower":true, ... }
// ─────────────────────────────────────────────────────────────────────────────
function parseFirmwareOwnerFormat(msg: any, deviceId: string): {
  sensorReadings: { type: string; value: number; unit: string }[];
  statusUpdate: any | null;
} {
  const readings: { type: string; value: number; unit: string }[] = [];

  // Sensor Debu ZH03B #1 — Kontrol Pompa (DUST1)
  if (msg.pm25_ctrl !== undefined) readings.push({ type: 'DUST1',      value: msg.pm25_ctrl,  unit: 'ug/m3' });
  if (msg.pm1_ctrl  !== undefined) readings.push({ type: 'DUST1_PM1',  value: msg.pm1_ctrl,   unit: 'ug/m3' });
  if (msg.pm10_ctrl !== undefined) readings.push({ type: 'DUST1_PM10', value: msg.pm10_ctrl,  unit: 'ug/m3' });

  // Sensor Debu ZH03B #2 — Monitoring (DUST2)
  if (msg.pm25_mon  !== undefined) readings.push({ type: 'DUST2',      value: msg.pm25_mon,   unit: 'ug/m3' });
  if (msg.pm1_mon   !== undefined) readings.push({ type: 'DUST2_PM1',  value: msg.pm1_mon,    unit: 'ug/m3' });
  if (msg.pm10_mon  !== undefined) readings.push({ type: 'DUST2_PM10', value: msg.pm10_mon,   unit: 'ug/m3' });

  // BME680
  if (msg.temp !== undefined)      readings.push({ type: 'BME680_TEMP', value: msg.temp,       unit: 'C'      });
  if (msg.hum  !== undefined)      readings.push({ type: 'BME680_HUM',  value: msg.hum,        unit: '%'      });
  if (msg.voc  !== undefined)      readings.push({ type: 'BME680',      value: msg.voc,        unit: 'mg/m3'  });

  // MQ-7 CO
  if (msg.co   !== undefined)      readings.push({ type: 'MQ7',         value: msg.co,         unit: 'ppm'    });

  // Turbidity
  if (msg.ntu  !== undefined)      readings.push({ type: 'TURBIDITY',   value: msg.ntu,        unit: 'NTU'    });

  // Status pompa & blower
  let statusUpdate = null;
  const hasPumpOrBlower = msg.pump_pwm !== undefined || msg.blower !== undefined;
  if (hasPumpOrBlower) {
    statusUpdate = {
      device_id: deviceId,
      components: {
        pump: {
          status:    (msg.pump_pwm ?? 0) > 0 ? 'ON' : 'OFF',
          load:      msg.pump_pwm !== undefined ? Math.round((msg.pump_pwm / 255) * 100) : 0,
          level:     msg.pump_level ?? 0,
          mode:      msg.pump_mode ?? 'AUTO',
        },
        blower: {
          status:    msg.blower ? 'ON' : 'OFF',
          rpm:       0, // firmware tidak kirim RPM
        },
      },
      air_quality_ctrl: msg.air_quality_ctrl ?? '---',
      air_quality_mon:  msg.air_quality_mon  ?? '---',
      alarm:            msg.alarm            ?? '',
    };
  }

  return { sensorReadings: readings, statusUpdate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Deteksi apakah pesan dari format firmware Owner (flat JSON tanpa "type")
// ─────────────────────────────────────────────────────────────────────────────
function isFirmwareOwnerFormat(msg: any): boolean {
  return (
    msg.type === undefined &&
    (msg.pm25_ctrl !== undefined ||
     msg.co        !== undefined ||
     msg.ntu       !== undefined ||
     msg.temp      !== undefined)
  );
}

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

          // ── Format Firmware Owner (flat JSON) ────────────────────
          if (isFirmwareOwnerFormat(message)) {
            const { sensorReadings, statusUpdate } = parseFirmwareOwnerFormat(message, deviceId);

            // Broadcast data sensor ke frontend dalam format standar
            if (sensorReadings.length > 0) {
              const sensorPayload = {
                type: 'sensor_data',
                deviceId,
                readings: sensorReadings,
              };
              io.emit('sensor_update', sensorPayload);

              // Simpan ke PostgreSQL
              for (const reading of sensorReadings) {
                await pgClient.query(
                  'INSERT INTO sensor_readings (device_id, sensor_type, sensor_value, unit) VALUES ($1, $2, $3, $4)',
                  [deviceId, reading.type, reading.value, reading.unit]
                ).catch(e => console.error('DB insert error:', e));
              }
            }

            // Broadcast status pompa/blower ke frontend
            if (statusUpdate) {
              io.emit('device_status', statusUpdate);
            }

            return; // Selesai, jangan lanjut ke switch bawah
          }

          // ── Format Lama (readings array, dari skeleton / simulator) ──
          switch (message.type) {
            case 'sensor_data': {
              io.emit('sensor_update', message);

              if (message.readings && Array.isArray(message.readings)) {
                for (const reading of message.readings) {
                  await pgClient.query(
                    'INSERT INTO sensor_readings (device_id, sensor_type, sensor_value, unit) VALUES ($1, $2, $3, $4)',
                    [deviceId, reading.type, reading.value, reading.unit]
                  ).catch(e => console.error('Gagal menyimpan data sensor:', e));
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
