import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const hasDatabaseConfig = process.env.DB_HOST && process.env.DB_DATABASE;

export const pool = hasDatabaseConfig
  ? new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
    })
  : null;

export const isDatabaseConfigured = Boolean(pool);
