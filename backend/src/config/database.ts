import { Client } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const pgClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/asap_monitor'
});

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

export const connectDB = async () => {
  try {
    await pgClient.connect();
    console.log('📦 Connected to PostgreSQL');
    
    await redisClient.connect();
    console.log('📦 Connected to Redis');
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
};
