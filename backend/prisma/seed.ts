/**
 * Seed inicial del Sprint 1.
 * Crea roles, permisos base, usuario administrador, una temporada y las 8 categorías.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = [
  'Superadministrador',
  'Administrador de liga',
  'Coordinador',
  'Delegado de equipo',
  'Árbitro',
  'Digitador',
  'Público',
];

const PERMISOS = [
  { codigo: 'usuarios:gestionar', descripcion: 'Crear/editar/eliminar usuarios' },
  { codigo: 'roles:gestionar', descripcion: 'Gestionar roles y permisos' },
  { codigo: 'categorias:gestionar', descripcion: 'Gestionar categorías' },
  { codigo: 'temporadas:gestionar', descripcion: 'Gestionar temporadas' },
  { codigo: 'clubes:gestionar', descripcion: 'Gestionar clubes' },
  { codigo: 'equipos:gestionar', descripcion: 'Gestionar equipos' },
  { codigo: 'inscripciones:gestionar', descripcion: 'Gestionar inscripciones' },
  { codigo: 'pagos:registrar', descripcion: 'Registrar pagos' },
  { codigo: 'pagos:gestionar', descripcion: 'Eliminar/anular pagos' },
  { codigo: 'torneos:gestionar', descripcion: 'Gestionar torneos' },
  { codigo: 'partidos:gestionar', descripcion: 'Programar y reprogramar partidos' },
  { codigo: 'resultados:registrar', descripcion: 'Registrar resultados y marcadores' },
  { codigo: 'publico:ver', descripcion: 'Ver portal público' },
];

const CATEGORIAS = [
  { nombre: 'Sub8',  edadMinima: 6,  edadMaxima: 8,  permiteSinCedula: true,  validaPorAnioNacimiento: true  },
  { nombre: 'Sub10', edadMinima: 8,  edadMaxima: 10, permiteSinCedula: true,  validaPorAnioNacimiento: true  },
  { nombre: 'Sub12', edadMinima: 10, edadMaxima: 12, permiteSinCedula: true,  validaPorAnioNacimiento: true  },
  { nombre: 'Sub14', edadMinima: 12, edadMaxima: 14, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Sub16', edadMinima: 14, edadMaxima: 16, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Sub18', edadMinima: 16, edadMaxima: 18, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Libre', edadMinima: 18, edadMaxima: 35, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Master',edadMinima: 35, edadMaxima: 99, permiteSinCedula: false, validaPorAnioNacimiento: false },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // Roles
  for (const nombre of ROLES) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre, descripcion: `Rol ${nombre}` },
    });
  }
  console.log(`✅ ${ROLES.length} roles listos`);

  // Permisos
  for (const p of PERMISOS) {
    await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      update: { descripcion: p.descripcion },
      create: p,
    });
  }
  console.log(`✅ ${PERMISOS.length} permisos listos`);

  // Categorías
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: c,
      create: c,
    });
  }
  console.log(`✅ ${CATEGORIAS.length} categorías listas`);

  // Temporada activa del año actual
  const anio = new Date().getFullYear();
  const existingTemp = await prisma.temporada.findFirst({ where: { anio, nombre: `Temporada ${anio}` } });
  if (!existingTemp) {
    await prisma.temporada.create({
      data: {
        nombre: `Temporada ${anio}`,
        anio,
        fechaInicio: new Date(`${anio}-01-01`),
        fechaFin: new Date(`${anio}-12-31`),
        estado: 'activa',
      },
    });
    console.log(`✅ Temporada ${anio} creada`);
  } else {
    console.log(`ℹ️  Temporada ${anio} ya existía`);
  }

  // Admin user
  const adminEmail = 'admin@liga.com';
  const existing = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash('admin123', rounds);
    const superRol = await prisma.rol.findUnique({ where: { nombre: 'Superadministrador' } });
    const user = await prisma.usuario.create({
      data: {
        nombre: 'Administrador General',
        email: adminEmail,
        passwordHash,
        roles: { create: [{ rolId: superRol!.id }] },
      },
    });
    console.log(`✅ Usuario admin creado: ${adminEmail} / admin123  (id: ${user.id})`);
  } else {
    console.log(`ℹ️  Usuario admin ya existía`);
  }

  console.log('🏁 Seed finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
