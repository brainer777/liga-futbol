# Tests del backend

## Cómo correrlos

```bash
cd backend
npm install          # requerido la primera vez
npm test             # tests unitarios (Jest) — ~52 tests
npm run test:cov     # idem con cobertura
npm run test:e2e     # tests e2e (HTTP vía supertest)
```

## Qué hay hoy

### ✅ Unitarios (corren de verdad, contra el código TS real)

Viven junto al código como `*.spec.ts`:

| Archivo | Cubre |
|---|---|
| `src/torneos/fixture.generator.spec.ts` | Round-robin, ida/vuelta, eliminación directa, doble eliminación, grupos y grupos+eliminación. Validaciones de formato y BYE. |
| `src/resultados/tabla.calculator.spec.ts` | Tabla de posiciones, los 4 criterios de desempate implementados (`diferencia_goles`, `gol_average`, `goles_favor`, `enfrentamiento_directo`), partidos no finalizados, estadísticas de jugador. |
| `src/jugadores/edad.validator.spec.ts` | Cálculo de edad, validación de categorías infantiles (Sub8/10/12, validación por año de nacimiento) vs. superiores (cédula obligatoria), fuera de rango. |

> Estos reemplazan a los scripts sueltos `scripts/test-fixture.js` y
> `scripts/test-tabla.js` (que reimplementaban la lógica en JS plano y **no**
> testeaban el código real). Esos scripts pueden borrarse.

### ✅ e2e (HTTP)

| Archivo | Cubre |
|---|---|
| `test/health.e2e-spec.ts` | `GET /health` con `PrismaService` mockeado: caso BD arriba y BD caída. |

Se mockea Prisma a propósito para **no** arrancar el PostgreSQL embebido (que
descarga un binario y es lento/frágil). Ejercita la capa HTTP real (pipes,
routing, serialización) vía supertest.

## ⚠️ Dos cosas que bloquean al backend (no son tests, pero las encontré al montarlos)

1. **`embedded-postgres@^17.0.1` no existe en npm.** El paquete solo publica
   betas (`17.x.x-beta.x`), y un rango con `^` no las matchea, así que
   `npm install` —y por lo tanto `npm test`— fallaba por completo. Lo fijé a
   `17.10.0-beta.17` (último de la línea 17.x; me quedé en 17 porque `.pgdata/`
   ya existe y un salto a 18.x podría romper esos datos). **Es un mejor
   esfuerzo, no está verificado**: ningún test arranca Postgres embebido.
   Confirmá que `npm run dev:init` / `npm run start:dev` levanta la BD antes de
   confiar en esta versión.

2. **`prisma/schema.prisma` no valida** (`npx prisma validate` → 2 errores):
   - línea 269: relación `tablaPosiciones TablaPosicion[]` → el modelo
     `TablaPosicion` nunca se definió.
   - línea 447: `tipo TipoFase @default(liga)` → el enum `TipoFase` nunca se
     definió.

   Mientras esto no se arregle, `prisma generate` falla y el backend **no
   puede compilar ni arrancar**. Los tests unitarios de arriba igual corren
   porque no importan Prisma; cualquier test e2e contra la BD real está
   bloqueado por esto.

## Trabajo futuro (scaffolding pendiente)

- **e2e contra la BD real**: importar `AppModule` completo + Postgres embebido
  (o un Postgres de test vía `DATABASE_URL`) y correr migraciones/seed antes de
  los tests. Permitiría probar auth/JWT, guards de roles y los CRUD end-to-end.
- **Tests de servicios** (`*.service.spec.ts`) con Prisma mockeado: reglas de
  negocio de pagos (cálculo de saldo, cambio de estado de inscripción) y
  sanciones automáticas (roja → 2 fechas, doble amarilla → 1, acumulación de 3
  amarillas → 1).

## Nota sobre comportamiento caracterizado

`validarJugador` (en `edad.validator.ts`) **nunca** devuelve `'rechazado'` pese
a que el tipo `NivelValidacion` lo permite: el ternario
`reglas.permiteSinCedula && esSubInfantil ? 'observado' : 'observado'` tiene
ambas ramas idénticas, así que con alertas siempre da `'observado'`. Los tests
documentan el comportamiento **actual**, no el deseado. Si se quiere distinguir
"observado" de "rechazado", hay que corregir esa lógica (y luego los tests).
