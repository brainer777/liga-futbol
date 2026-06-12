-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('activo', 'inactivo', 'bloqueado');

-- CreateEnum
CREATE TYPE "EstadoGeneral" AS ENUM ('activo', 'inactivo');

-- CreateEnum
CREATE TYPE "EstadoTemporada" AS ENUM ('activa', 'cerrada', 'planificada');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('preinscrito', 'pendiente_pago', 'pago_parcial', 'pagado', 'aprobado', 'observado', 'rechazado', 'vencido');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'transferencia');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('pendiente', 'habilitado', 'observado', 'rechazado', 'suspendido');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('pendiente', 'aprobado', 'rechazado', 'vencido');

-- CreateEnum
CREATE TYPE "EstadoHabilitacion" AS ENUM ('pendiente', 'habilitado', 'observado', 'rechazado', 'suspendido');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('borrador', 'programado', 'en_juego', 'finalizado', 'suspendido', 'reprogramado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoFase" AS ENUM ('pendiente', 'activa', 'finalizada');

-- CreateEnum
CREATE TYPE "TipoFase" AS ENUM ('liga', 'grupos', 'eliminacion');

-- CreateEnum
CREATE TYPE "TipoEventoPartido" AS ENUM ('gol', 'gol_en_contra', 'asistencia', 'amarilla', 'roja', 'doble_amarilla', 'cambio', 'otro');

-- CreateEnum
CREATE TYPE "EstadoSancion" AS ENUM ('pendiente', 'cumplida', 'condonada', 'anulada');

-- CreateEnum
CREATE TYPE "MotivoSancion" AS ENUM ('acumulacion_amarillas', 'roja_directa', 'doble_amarilla', 'conducta', 'administrativa', 'otro');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_roles" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "edad_minima" INTEGER,
    "edad_maxima" INTEGER,
    "permite_sin_cedula" BOOLEAN NOT NULL DEFAULT false,
    "valida_por_anio_nacimiento" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporadas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "anio" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "EstadoTemporada" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temporadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubes" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "sigla" VARCHAR(20),
    "representante" VARCHAR(150),
    "telefono" VARCHAR(30),
    "email" VARCHAR(150),
    "direccion" VARCHAR(255),
    "logo_url" VARCHAR(255),
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "delegado_nombre" VARCHAR(150),
    "delegado_telefono" VARCHAR(30),
    "delegado_email" VARCHAR(150),
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "torneos" (
    "id" UUID NOT NULL,
    "temporada_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "formato" VARCHAR(50) NOT NULL DEFAULT 'todos_contra_todos',
    "puntos_victoria" INTEGER NOT NULL DEFAULT 3,
    "puntos_empate" INTEGER NOT NULL DEFAULT 1,
    "puntos_derrota" INTEGER NOT NULL DEFAULT 0,
    "criterio_desempate" TEXT NOT NULL DEFAULT 'diferencia_goles',
    "permite_reprogramacion" BOOLEAN NOT NULL DEFAULT true,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'borrador',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "torneos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" UUID NOT NULL,
    "torneo_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "fecha_inscripcion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costo_inscripcion" DECIMAL(12,2) NOT NULL,
    "fecha_limite_pago" DATE,
    "monto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_pendiente" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'pendiente_pago',
    "observaciones" TEXT,
    "creado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL,
    "inscripcion_id" UUID NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "numero_recibo" VARCHAR(50),
    "referencia_transferencia" VARCHAR(80),
    "observaciones" TEXT,
    "comprobante_url" VARCHAR(255),
    "registrado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugadores" (
    "id" UUID NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "apellidos" VARCHAR(150) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "anio_nacimiento" INTEGER,
    "tipo_documento" VARCHAR(30),
    "numero_documento" VARCHAR(50),
    "foto_url" VARCHAR(255),
    "estado_validacion" "EstadoValidacion" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugadores_documentos" (
    "id" UUID NOT NULL,
    "jugador_id" UUID NOT NULL,
    "tipo_documento" VARCHAR(50) NOT NULL,
    "archivo_url" VARCHAR(255) NOT NULL,
    "nombre_archivo" VARCHAR(255),
    "tipo_archivo" VARCHAR(80),
    "tamano_bytes" INTEGER,
    "observaciones" TEXT,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'pendiente',
    "validado_por_id" UUID,
    "validado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jugadores_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo_jugadores" (
    "id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "jugador_id" UUID NOT NULL,
    "dorsal" INTEGER,
    "posicion" VARCHAR(50),
    "fecha_incorporacion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado_habilitacion" "EstadoHabilitacion" NOT NULL DEFAULT 'pendiente',
    "motivo_observacion" TEXT,
    "validado_por_id" UUID,
    "validado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipo_jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fases_torneo" (
    "id" UUID NOT NULL,
    "torneo_id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "TipoFase" NOT NULL DEFAULT 'liga',
    "orden" INTEGER NOT NULL DEFAULT 1,
    "estado" "EstadoFase" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fases_torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" UUID NOT NULL,
    "fase_id" UUID NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_equipos" (
    "id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidos" (
    "id" UUID NOT NULL,
    "torneo_id" UUID NOT NULL,
    "fase_id" UUID,
    "grupo_id" UUID,
    "jornada" INTEGER,
    "etapa_eliminatoria" VARCHAR(50),
    "llave_id" UUID,
    "es_ida" BOOLEAN NOT NULL DEFAULT true,
    "equipo_local_id" UUID NOT NULL,
    "equipo_visitante_id" UUID NOT NULL,
    "fecha_programada" DATE,
    "hora_programada" VARCHAR(8),
    "cancha" VARCHAR(120),
    "arbitro_id" UUID,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'borrador',
    "observaciones" TEXT,
    "creado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidos_reprogramaciones" (
    "id" UUID NOT NULL,
    "partido_id" UUID NOT NULL,
    "fecha_anterior" DATE,
    "hora_anterior" VARCHAR(8),
    "cancha_anterior" VARCHAR(120),
    "fecha_nueva" DATE,
    "hora_nueva" VARCHAR(8),
    "cancha_nueva" VARCHAR(120),
    "motivo" TEXT,
    "reprogramado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partidos_reprogramaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados" (
    "id" UUID NOT NULL,
    "partido_id" UUID NOT NULL,
    "goles_local" INTEGER NOT NULL DEFAULT 0,
    "goles_visitante" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "cerrado_por_id" UUID,
    "cerrado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resultados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultado_eventos" (
    "id" UUID NOT NULL,
    "resultado_id" UUID NOT NULL,
    "tipo" "TipoEventoPartido" NOT NULL,
    "jugador_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "minuto" INTEGER,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultado_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanciones" (
    "id" UUID NOT NULL,
    "jugador_id" UUID NOT NULL,
    "torneo_id" UUID,
    "partido_id" UUID,
    "motivo" "MotivoSancion" NOT NULL,
    "fechas_cumplir" INTEGER NOT NULL DEFAULT 1,
    "fechas_cumplidas" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "estado" "EstadoSancion" NOT NULL DEFAULT 'pendiente',
    "aplicada_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estadisticas_jugador" (
    "id" UUID NOT NULL,
    "torneo_id" UUID NOT NULL,
    "jugador_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "partidos_jugados" INTEGER NOT NULL DEFAULT 0,
    "goles" INTEGER NOT NULL DEFAULT 0,
    "asistencias" INTEGER NOT NULL DEFAULT 0,
    "amarillas" INTEGER NOT NULL DEFAULT 0,
    "rojas" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estadisticas_jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estadisticas_equipo" (
    "id" UUID NOT NULL,
    "torneo_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "partidos_jugados" INTEGER NOT NULL DEFAULT 0,
    "victorias" INTEGER NOT NULL DEFAULT 0,
    "empates" INTEGER NOT NULL DEFAULT 0,
    "derrotas" INTEGER NOT NULL DEFAULT 0,
    "goles_favor" INTEGER NOT NULL DEFAULT 0,
    "goles_contra" INTEGER NOT NULL DEFAULT 0,
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estadisticas_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");

-- CreateIndex
CREATE INDEX "usuario_roles_usuario_id_idx" ON "usuario_roles"("usuario_id");

-- CreateIndex
CREATE INDEX "usuario_roles_rol_id_idx" ON "usuario_roles"("rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_roles_usuario_id_rol_id_key" ON "usuario_roles"("usuario_id", "rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "temporadas_anio_nombre_key" ON "temporadas"("anio", "nombre");

-- CreateIndex
CREATE INDEX "equipos_club_id_idx" ON "equipos"("club_id");

-- CreateIndex
CREATE INDEX "equipos_categoria_id_idx" ON "equipos"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_club_id_categoria_id_nombre_key" ON "equipos"("club_id", "categoria_id", "nombre");

-- CreateIndex
CREATE INDEX "torneos_temporada_id_idx" ON "torneos"("temporada_id");

-- CreateIndex
CREATE INDEX "torneos_categoria_id_idx" ON "torneos"("categoria_id");

-- CreateIndex
CREATE INDEX "inscripciones_torneo_id_idx" ON "inscripciones"("torneo_id");

-- CreateIndex
CREATE INDEX "inscripciones_equipo_id_idx" ON "inscripciones"("equipo_id");

-- CreateIndex
CREATE INDEX "inscripciones_estado_idx" ON "inscripciones"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_torneo_id_equipo_id_key" ON "inscripciones"("torneo_id", "equipo_id");

-- CreateIndex
CREATE INDEX "pagos_inscripcion_id_idx" ON "pagos"("inscripcion_id");

-- CreateIndex
CREATE INDEX "pagos_fecha_pago_idx" ON "pagos"("fecha_pago");

-- CreateIndex
CREATE INDEX "jugadores_numero_documento_idx" ON "jugadores"("numero_documento");

-- CreateIndex
CREATE INDEX "jugadores_estado_validacion_idx" ON "jugadores"("estado_validacion");

-- CreateIndex
CREATE INDEX "jugadores_apellidos_nombres_idx" ON "jugadores"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "jugadores_documentos_jugador_id_idx" ON "jugadores_documentos"("jugador_id");

-- CreateIndex
CREATE INDEX "jugadores_documentos_estado_idx" ON "jugadores_documentos"("estado");

-- CreateIndex
CREATE INDEX "equipo_jugadores_equipo_id_idx" ON "equipo_jugadores"("equipo_id");

-- CreateIndex
CREATE INDEX "equipo_jugadores_jugador_id_idx" ON "equipo_jugadores"("jugador_id");

-- CreateIndex
CREATE INDEX "equipo_jugadores_estado_habilitacion_idx" ON "equipo_jugadores"("estado_habilitacion");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_jugadores_equipo_id_jugador_id_key" ON "equipo_jugadores"("equipo_id", "jugador_id");

-- CreateIndex
CREATE INDEX "fases_torneo_torneo_id_idx" ON "fases_torneo"("torneo_id");

-- CreateIndex
CREATE INDEX "grupos_fase_id_idx" ON "grupos"("fase_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_fase_id_nombre_key" ON "grupos"("fase_id", "nombre");

-- CreateIndex
CREATE INDEX "grupo_equipos_equipo_id_idx" ON "grupo_equipos"("equipo_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_equipos_grupo_id_equipo_id_key" ON "grupo_equipos"("grupo_id", "equipo_id");

-- CreateIndex
CREATE INDEX "partidos_torneo_id_idx" ON "partidos"("torneo_id");

-- CreateIndex
CREATE INDEX "partidos_fase_id_idx" ON "partidos"("fase_id");

-- CreateIndex
CREATE INDEX "partidos_grupo_id_idx" ON "partidos"("grupo_id");

-- CreateIndex
CREATE INDEX "partidos_equipo_local_id_idx" ON "partidos"("equipo_local_id");

-- CreateIndex
CREATE INDEX "partidos_equipo_visitante_id_idx" ON "partidos"("equipo_visitante_id");

-- CreateIndex
CREATE INDEX "partidos_fecha_programada_idx" ON "partidos"("fecha_programada");

-- CreateIndex
CREATE INDEX "partidos_estado_idx" ON "partidos"("estado");

-- CreateIndex
CREATE INDEX "partidos_reprogramaciones_partido_id_idx" ON "partidos_reprogramaciones"("partido_id");

-- CreateIndex
CREATE UNIQUE INDEX "resultados_partido_id_key" ON "resultados"("partido_id");

-- CreateIndex
CREATE INDEX "resultados_partido_id_idx" ON "resultados"("partido_id");

-- CreateIndex
CREATE INDEX "resultado_eventos_resultado_id_idx" ON "resultado_eventos"("resultado_id");

-- CreateIndex
CREATE INDEX "resultado_eventos_jugador_id_idx" ON "resultado_eventos"("jugador_id");

-- CreateIndex
CREATE INDEX "resultado_eventos_equipo_id_idx" ON "resultado_eventos"("equipo_id");

-- CreateIndex
CREATE INDEX "sanciones_jugador_id_idx" ON "sanciones"("jugador_id");

-- CreateIndex
CREATE INDEX "sanciones_torneo_id_idx" ON "sanciones"("torneo_id");

-- CreateIndex
CREATE INDEX "sanciones_estado_idx" ON "sanciones"("estado");

-- CreateIndex
CREATE INDEX "estadisticas_jugador_torneo_id_idx" ON "estadisticas_jugador"("torneo_id");

-- CreateIndex
CREATE INDEX "estadisticas_jugador_jugador_id_idx" ON "estadisticas_jugador"("jugador_id");

-- CreateIndex
CREATE UNIQUE INDEX "estadisticas_jugador_torneo_id_jugador_id_key" ON "estadisticas_jugador"("torneo_id", "jugador_id");

-- CreateIndex
CREATE INDEX "estadisticas_equipo_torneo_id_idx" ON "estadisticas_equipo"("torneo_id");

-- CreateIndex
CREATE UNIQUE INDEX "estadisticas_equipo_torneo_id_equipo_id_key" ON "estadisticas_equipo"("torneo_id", "equipo_id");

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_temporada_id_fkey" FOREIGN KEY ("temporada_id") REFERENCES "temporadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "inscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jugadores_documentos" ADD CONSTRAINT "jugadores_documentos_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jugadores_documentos" ADD CONSTRAINT "jugadores_documentos_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_jugadores" ADD CONSTRAINT "equipo_jugadores_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_jugadores" ADD CONSTRAINT "equipo_jugadores_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_jugadores" ADD CONSTRAINT "equipo_jugadores_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fases_torneo" ADD CONSTRAINT "fases_torneo_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "fases_torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_equipos" ADD CONSTRAINT "grupo_equipos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_equipos" ADD CONSTRAINT "grupo_equipos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "fases_torneo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_equipo_local_id_fkey" FOREIGN KEY ("equipo_local_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_equipo_visitante_id_fkey" FOREIGN KEY ("equipo_visitante_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos_reprogramaciones" ADD CONSTRAINT "partidos_reprogramaciones_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados" ADD CONSTRAINT "resultados_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados" ADD CONSTRAINT "resultados_cerrado_por_id_fkey" FOREIGN KEY ("cerrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_eventos" ADD CONSTRAINT "resultado_eventos_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "resultados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanciones" ADD CONSTRAINT "sanciones_aplicada_por_id_fkey" FOREIGN KEY ("aplicada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadisticas_equipo" ADD CONSTRAINT "estadisticas_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
