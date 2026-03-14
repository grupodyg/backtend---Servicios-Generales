const { Pool } = require('pg');
require('dotenv').config();

// Configuracion de timezone para Node.js
// Esto asegura que new Date() retorne la hora de Lima
process.env.TZ = process.env.TZ || 'America/Lima';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Configuracion de pool de conexiones
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Establecer timezone de PostgreSQL en cada nueva conexion
// Esto asegura que CURRENT_TIMESTAMP retorne la hora de Lima
pool.on('connect', async (client) => {
  try {
    await client.query("SET timezone = 'America/Lima'");
  } catch (err) {
    console.error('Error estableciendo timezone en PostgreSQL:', err.message);
  }
});

// Log de conexion exitosa (solo en desarrollo)
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = pool;
