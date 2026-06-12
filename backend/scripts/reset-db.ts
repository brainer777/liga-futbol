/**
 * Resetea la base de datos: borra .pgdata, reinicializa, migra y siembra.
 *
 * Uso: ts-node scripts/reset-db.ts            # Borra todo desde cero
 *      ts-node scripts/reset-db.ts --keep     # Conserva el cluster, pero reaplica migraciones + seed
 */
import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getEmbeddedPgConfig } from '../src/config/database.config';

const keep = process.argv.includes('--keep');

async function main() {
  const cfg = getEmbeddedPgConfig();
  const backendDir = path.resolve(__dirname, '..');

  if (!keep) {
    console.log('🗑️  [reset-db] Borrando', cfg.dataDir);
    if (fs.existsSync(cfg.dataDir)) fs.rmSync(cfg.dataDir, { recursive: true, force: true });
  } else {
    console.log('ℹ️  [reset-db] Modo --keep: no se borra .pgdata');
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

  if (keep) {
    console.log('🔄 [reset-db] Aplicando migraciones con reset...');
    execSync('npx prisma migrate reset --force --skip-seed', { cwd: backendDir, stdio: 'inherit', env: process.env });
  } else {
    console.log('🔄 [reset-db] Aplicando migraciones...');
    execSync('npx prisma migrate dev --name init', { cwd: backendDir, stdio: 'inherit', env: process.env });
  }
  console.log('🌱 [reset-db] Ejecutando seed...');
  execSync('npx ts-node prisma/seed.ts', { cwd: backendDir, stdio: 'inherit', env: process.env });

  await pg.stop();
  console.log('✅ [reset-db] Listo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
