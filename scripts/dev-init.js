#!/usr/bin/env node
// Inicializa el backend y el frontend en una sola pasada.
// Uso:  node scripts/dev-init.js
//       o   npm run dev:init   (desde la raíz)

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');

function log(msg) {
  console.log(`\x1b[36m[dev-init]\x1b[0m ${msg}`);
}
function run(cmd, args, cwd, name) {
  return new Promise((resolve, reject) => {
    log(`▶ ${name}: ${cmd} ${args.join(' ')}`);
    const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} salió con código ${code}`));
    });
  });
}

(async () => {
  try {
    // 1) Verificar que .env existe, si no copiar de .env.example
    const envPath = path.join(backend, '.env');
    if (!fs.existsSync(envPath)) {
      log('No existe backend/.env — copiando de .env.example');
      fs.copyFileSync(path.join(backend, '.env.example'), envPath);
      log('⚠️  Editá backend/.env y reemplazá los CHANGE_ME antes de seguir.');
    }
    const envLocal = path.join(root, 'frontend', '.env.local');
    if (!fs.existsSync(envLocal)) {
      log('No existe frontend/.env.local — copiando de .env.local.example');
      fs.copyFileSync(path.join(root, 'frontend', '.env.local.example'), envLocal);
    }

    // 2) Instalar dependencias (si no existen)
    if (!fs.existsSync(path.join(backend, 'node_modules'))) {
      log('Instalando dependencias del backend...');
      await run('npm', ['install'], backend, 'backend');
    } else {
      log('Backend: node_modules ya existe — OK');
    }
    if (!fs.existsSync(path.join(root, 'frontend', 'node_modules'))) {
      log('Instalando dependencias del frontend...');
      await run('npm', ['install'], path.join(root, 'frontend'), 'frontend');
    } else {
      log('Frontend: node_modules ya existe — OK');
    }

    // 3) Inicializar base de datos embebida
    log('Inicializando base de datos (PG embebido + migraciones + seed)...');
    await run('npm', ['run', 'db:init'], backend, 'backend');

    log('✅ Listo. Para arrancar:');
    log('   cd backend  && npm run start:dev   # http://localhost:3001/api');
    log('   cd frontend && npm run dev         # http://localhost:3000');
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();
