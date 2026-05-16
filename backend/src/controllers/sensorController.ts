import { Request, Response } from 'express';
import { pgClient } from '../config/database';

export const getSensorHistory = async (req: Request, res: Response): Promise<void> => {
  const { device_id } = req.params;
  const { sensor, limit = 100, hours = 24 } = req.query;

  try {
    const result = await pgClient.query(
      `SELECT * FROM sensor_readings 
       WHERE device_id = $1 AND sensor_type = $2 
       AND timestamp > NOW() - INTERVAL '${Number(hours)} hours'
       ORDER BY timestamp DESC LIMIT $3`,
      [device_id, String(sensor), Number(limit)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
