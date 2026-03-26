const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Busca el ejecutable pg_dump en ubicaciones comunes de Windows
 */
const findPgDump = () => {
  // Primero intentar con el PATH del sistema
  const pgDumpName = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';

  // Rutas comunes de PostgreSQL en Windows
  const commonPaths = [];
  if (process.platform === 'win32') {
    const pgBase = 'C:\\Program Files\\PostgreSQL';
    try {
      if (fs.existsSync(pgBase)) {
        const versions = fs.readdirSync(pgBase).sort((a, b) => Number(b) - Number(a));
        for (const ver of versions) {
          commonPaths.push(path.join(pgBase, ver, 'bin', pgDumpName));
        }
      }
    } catch (_) {}
  }

  for (const fullPath of commonPaths) {
    if (fs.existsSync(fullPath)) return fullPath;
  }

  // Fallback: dejar que el sistema lo resuelva por PATH
  return 'pg_dump';
};

/**
 * Parsea DATABASE_URL para extraer las credenciales de PostgreSQL
 */
const parseDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está configurada');

  const regex = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = url.match(regex);
  if (!match) throw new Error('DATABASE_URL tiene formato inválido');

  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  };
};

/**
 * Genera un nombre de archivo para el backup con timestamp
 */
const generateBackupFilename = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `backup_${timestamp}.sql`;
};

/**
 * Ejecuta pg_dump y retorna el contenido como Buffer
 */
const createDatabaseBackup = () => {
  return new Promise((resolve, reject) => {
    const db = parseDatabaseUrl();

    const args = [
      '-h', db.host,
      '-p', db.port,
      '-U', db.user,
      '-d', db.database,
      '--no-owner',
      '--clean',
      '--if-exists'
    ];

    const pgDumpPath = findPgDump();

    const pgDump = spawn(pgDumpPath, args, {
      env: { ...process.env, PGPASSWORD: db.password }
    });

    const chunks = [];
    let errorOutput = '';

    pgDump.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    pgDump.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pgDump.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`pg_dump falló (código ${code}): ${errorOutput}`));
      }
      resolve(Buffer.concat(chunks));
    });

    pgDump.on('error', (err) => {
      if (err.code === 'ENOENT') {
        return reject(new Error(
          'pg_dump no encontrado. Asegúrate de que PostgreSQL esté instalado y pg_dump esté en el PATH del sistema.'
        ));
      }
      reject(err);
    });
  });
};

module.exports = { createDatabaseBackup, generateBackupFilename };
