-- Multi-liga fase 3b: retirar la columna `singleton` de configuracion.
-- Queda redundante: `liga_id` (UNIQUE) es ahora la clave de identidad de la fila
-- (una Configuracion por liga). El servicio resuelve por la liga del contexto.
-- Al dropear la columna, su índice unique (configuracion_singleton_key) cae solo.
ALTER TABLE "configuracion" DROP COLUMN "singleton";
