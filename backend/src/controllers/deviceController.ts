import { Request, Response } from 'express';
import { pgClient, redisClient } from '../config/database';

export const getDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgClient.query('SELECT * FROM devices');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const registerDevice = async (req: Request, res: Response): Promise<void> => {
  const { id, name, type, ip_address } = req.body;
  try {
    const result = await pgClient.query(
      'INSERT INTO devices (id, name, type, ip_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, type, ip_address]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
