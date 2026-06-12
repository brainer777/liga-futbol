/**
 * Inicializa embedded-postgres, ejecuta migraciones Prisma y corre el seed.
 *
 * Uso: ts-node scripts/init-db.ts
 */
import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getEmbeddedPgConfig } from '../src/config/database.config';

async function main() {
  const cfg = getEmbeddedPgConfig();
  const backendDir = path.resolve(__dirname, '..');

  console.log('📦 [init-db] Verificando PostgreSQL embebido...');
  if (fs.existsSync(path.join(cfg.dataDir, 'PG_VERSION'))) {
    console.log('ℹ️  Ya existe un cluster en', cfg.dataDir, '— se usará el existente.');
  } else {
    console.log('Inicializando cluster nuevo en', cfg.dataDir);
  }

  const pg = new EmbeddedPostgres({
    databaseDir: cfg.dataDir,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port,
    persistent: true,
  });
  if (!fs.existsSync(path.join(cfg.dataDir, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();
  try { await pg.createDatabase(cfg.database); } catch (_) { /* ya existe */ }

  console.log('🚀 [init-db] PG embebido levantado. Aplicando migraciones...');
  execSync('npx prisma migrate dev --name init', { cwd: backendDir, stdio: 'inherit', env: process.env });

  console.log('🌱 [init-db] Ejecutando seed...');
  execSync('npx ts-node prisma/seed.ts', { cwd: backendDir, stdio: 'inherit', env: process.env });

  await pg.stop();
  console.log('✅ [init-db] Listo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
