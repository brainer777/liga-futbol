/**
 * Reglas de validación de edad.
 *
 * - En todas las categorías: si hay fecha de nacimiento válida, se usa.
 * - En Sub8 / Sub10 / Sub12: si no hay cédula, se permite validar por
 *   año de nacimiento únicamente.
 * - En categorías superiores: cédula es obligatoria.
 */
export interface CategoriaReglas {
  nombre: string;
  edadMinima?: number | null;
  edadMaxima?: number | null;
  permiteSinCedula: boolean;
  validaPorAnioNacimiento: boolean;
}

export interface ValidacionInput {
  fechaNacimiento: Date;
  anioNacimiento?: number | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
}

export type NivelValidacion = 'ok' | 'observado' | 'rechazado';

export interface ResultadoValidacion {
  nivel: NivelValidacion;
  edad: number;
  cumpleRango: boolean;
  tieneDocumento: boolean;
  documentoObligatorio: boolean;
  alertas: string[];
}

export const SUBCATEGORIAS_INFANTILES = new Set(['Sub8', 'Sub10', 'Sub12']);

export function calcularEdad(fecha: Date, referencia: Date = new Date()): number {
  let edad = referencia.getFullYear() - fecha.getFullYear();
  const m = referencia.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && referencia.getDate() < fecha.getDate())) {
    edad--;
  }
  return edad;
}

export function validarJugador(
  reglas: CategoriaReglas,
  input: ValidacionInput,
): ResultadoValidacion {
  const edad = calcularEdad(input.fechaNacimiento);
  const enRango =
    (reglas.edadMinima == null || edad >= reglas.edadMinima) &&
    (reglas.edadMaxima == null || edad <= reglas.edadMaxima);
  const tieneDocumento = !!(input.tipoDocumento && input.numeroDocumento);
  const esSubInfantil = SUBCATEGORIAS_INFANTILES.has(reglas.nombre);

  const alertas: string[] = [];
  let documentoObligatorio = !reglas.permiteSinCedula;

  if (!tieneDocumento) {
    if (esSubInfantil && reglas.validaPorAnioNacimiento) {
      // Permitido: validar por año de nacimiento
      documentoObligatorio = false;
      if (input.anioNacimiento == null) {
        alertas.push('Sin cédula: indique el año de nacimiento para validar.');
      } else {
        const esperado =
          new Date().getFullYear() - Number(input.anioNacimiento);
        if (Math.abs(esperado - edad) > 1) {
          alertas.push(
            `Año de nacimiento (${input.anioNacimiento}) no coincide con la fecha de nacimiento indicada.`,
          );
        }
      }
    } else {
      alertas.push('Documento de identidad obligatorio para esta categoría.');
    }
  }

  if (!enRango) {
    alertas.push(
      `Edad ${edad} fuera del rango de la categoría ${reglas.nombre} (${reglas.edadMinima ?? '?'}–${reglas.edadMaxima ?? '?'} años).`,
    );
  }

  let nivel: NivelValidacion = 'ok';
  if (alertas.length > 0) {
    nivel = reglas.permiteSinCedula && esSubInfantil ? 'observado' : 'observado';
  }
  if (!enRango) {
    // Si está claramente fuera de rango y NO es sub-infantil, queda observado
    // (no se rechaza automáticamente: queda pendiente de revisión manual).
    nivel = 'observado';
  }

  return {
    nivel,
    edad,
    cumpleRango: enRango,
    tieneDocumento,
    documentoObligatorio,
    alertas,
  };
}
