import mysql from 'mysql2/promise';
import config from './config.js';

let pool = null;

export const connectDB = async () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
      user: process.env.DB_USERNAME || process.env.MYSQL_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'rootpassword',
      database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'marketplace',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return pool;
};

export const getConnection = async () => {
  const pool = await connectDB();
  return pool.getConnection();
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

export default { connectDB, getConnection, closePool };