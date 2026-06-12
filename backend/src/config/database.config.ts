// ============================================
// Configuración de base de datos
// ============================================
// Centraliza los fallbacks para dev con embedded-postgres.
// Para producción o un servidor real, sobreescribí las variables en .env.

import * as path from 'path';

export const PG_DEFAULTS = {
  user: 'liga_user',
  password: 'CHANGE_ME',
  port: 5432,
  database: 'liga_futbol',
};

/**
 * Resuelve el data dir del PostgreSQL embebido.
 *
 * IMPORTANTE: se resuelve de forma *lazy* (no como constante de módulo) porque
 * `@nestjs/config` carga el `.env` recién al iniciar la app, después de que se
 * importan estos módulos. Si se resolviera al importar, `EMBEDDED_PG_DATA_DIR`
 * del `.env` se ignoraría y caería al default. `getEmbeddedPgConfig()` se llama
 * en `onModuleInit`, cuando el `.env` ya está cargado.
 */
export function resolveDataDir(): string {
  return path.resolve(
    process.env.EMBEDDED_PG_DATA_DIR ||
      path.join(__dirname, '..', '..', '..', '.pgdata'),
  );
}

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL;
  }
  const u = process.env.EMBEDDED_PG_USER || PG_DEFAULTS.user;
  const p = process.env.EMBEDDED_PG_PASSWORD || PG_DEFAULTS.password;
  const port = process.env.EMBEDDED_PG_PORT || String(PG_DEFAULTS.port);
  return `postgresql://${u}:${p}@localhost:${port}/${PG_DEFAULTS.database}?schema=public`;
}

export function getEmbeddedPgConfig() {
  return {
    user: process.env.EMBEDDED_PG_USER || PG_DEFAULTS.user,
    password: process.env.EMBEDDED_PG_PASSWORD || PG_DEFAULTS.password,
    port: parseInt(process.env.EMBEDDED_PG_PORT || String(PG_DEFAULTS.port), 10),
    database: PG_DEFAULTS.database,
    dataDir: resolveDataDir(),
  };
}

export const APP_DEFAULTS = {
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
  jwtSecret: process.env.JWT_SECRET || 'CHANGE_ME',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
};
