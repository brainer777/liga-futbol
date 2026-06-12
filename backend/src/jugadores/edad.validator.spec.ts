import {
  calcularEdad,
  validarJugador,
  SUBCATEGORIAS_INFANTILES,
  CategoriaReglas,
} from './edad.validator';

/**
 * Helper: construye una fecha de nacimiento que da exactamente `edad` años
 * respecto a `referencia`. Evita hardcodear años (que harían que el test
 * se rompa con el paso del tiempo).
 */
function nacimientoParaEdad(edad: number, referencia: Date): Date {
  return new Date(referencia.getFullYear() - edad, referencia.getMonth(), referencia.getDate());
}

const SUB10: CategoriaReglas = {
  nombre: 'Sub10',
  edadMinima: 8,
  edadMaxima: 10,
  permiteSinCedula: true,
  validaPorAnioNacimiento: true,
};

const MASTER: CategoriaReglas = {
  nombre: 'Master',
  edadMinima: 35,
  edadMaxima: null,
  permiteSinCedula: false,
  validaPorAnioNacimiento: false,
};

const LIBRE: CategoriaReglas = {
  nombre: 'Libre',
  edadMinima: 18,
  edadMaxima: null,
  permiteSinCedula: false,
  validaPorAnioNacimiento: false,
};

describe('calcularEdad', () => {
  const referencia = new Date(2026, 5, 12); // 12-jun-2026

  it('calcula la edad exacta cuando ya pasó el cumpleaños', () => {
    expect(calcularEdad(new Date(2000, 0, 1), referencia)).toBe(26);
  });

  it('resta un año cuando el cumpleaños aún no llegó este año', () => {
    // Nació el 31-dic-2000 → al 12-jun-2026 todavía no cumplió en 2026
    expect(calcularEdad(new Date(2000, 11, 31), referencia)).toBe(25);
  });

  it('cuenta el año si el cumpleaños es justo hoy', () => {
    expect(calcularEdad(new Date(2010, 5, 12), referencia)).toBe(16);
  });

  it('no cuenta el año si el cumpleaños es mañana', () => {
    expect(calcularEdad(new Date(2010, 5, 13), referencia)).toBe(15);
  });

  it('usa new Date() como referencia por defecto sin lanzar', () => {
    expect(typeof calcularEdad(new Date(2000, 0, 1))).toBe('number');
  });
});

describe('SUBCATEGORIAS_INFANTILES', () => {
  it('incluye Sub8, Sub10 y Sub12', () => {
    expect(SUBCATEGORIAS_INFANTILES.has('Sub8')).toBe(true);
    expect(SUBCATEGORIAS_INFANTILES.has('Sub10')).toBe(true);
    expect(SUBCATEGORIAS_INFANTILES.has('Sub12')).toBe(true);
  });

  it('no incluye categorías superiores', () => {
    expect(SUBCATEGORIAS_INFANTILES.has('Libre')).toBe(false);
    expect(SUBCATEGORIAS_INFANTILES.has('Master')).toBe(false);
  });
});

describe('validarJugador', () => {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  describe('categoría infantil (Sub10, permite sin cédula)', () => {
    it('un jugador en rango y con cédula queda "ok" sin alertas', () => {
      const r = validarJugador(SUB10, {
        fechaNacimiento: nacimientoParaEdad(9, hoy),
        tipoDocumento: 'cedula',
        numeroDocumento: '12345',
      });
      expect(r.nivel).toBe('ok');
      expect(r.alertas).toHaveLength(0);
      expect(r.cumpleRango).toBe(true);
      expect(r.tieneDocumento).toBe(true);
      expect(r.documentoObligatorio).toBe(false);
    });

    it('sin cédula pero con año de nacimiento coherente: ok, documento no obligatorio', () => {
      const r = validarJugador(SUB10, {
        fechaNacimiento: nacimientoParaEdad(9, hoy),
        anioNacimiento: anioActual - 9,
      });
      expect(r.tieneDocumento).toBe(false);
      expect(r.documentoObligatorio).toBe(false);
      expect(r.alertas).toHaveLength(0);
      expect(r.nivel).toBe('ok');
    });

    it('sin cédula y sin año de nacimiento: alerta pidiendo el año', () => {
      const r = validarJugador(SUB10, {
        fechaNacimiento: nacimientoParaEdad(9, hoy),
      });
      expect(r.documentoObligatorio).toBe(false);
      expect(r.alertas.some((a) => a.includes('año de nacimiento'))).toBe(true);
      expect(r.nivel).toBe('observado');
    });

    it('año de nacimiento incoherente con la fecha: alerta de no coincidencia', () => {
      const r = validarJugador(SUB10, {
        fechaNacimiento: nacimientoParaEdad(9, hoy),
        anioNacimiento: anioActual - 30, // muy lejos de la edad real
      });
      expect(r.alertas.some((a) => a.includes('no coincide'))).toBe(true);
      expect(r.nivel).toBe('observado');
    });

    it('edad fuera de rango queda "observado" (no se rechaza automáticamente)', () => {
      const r = validarJugador(SUB10, {
        fechaNacimiento: nacimientoParaEdad(15, hoy), // mayor al máximo 10
        tipoDocumento: 'cedula',
        numeroDocumento: '999',
      });
      expect(r.cumpleRango).toBe(false);
      expect(r.nivel).toBe('observado');
      expect(r.alertas.some((a) => a.includes('fuera del rango'))).toBe(true);
    });
  });

  describe('categoría superior (cédula obligatoria)', () => {
    it('con cédula y en rango: ok', () => {
      const r = validarJugador(LIBRE, {
        fechaNacimiento: nacimientoParaEdad(25, hoy),
        tipoDocumento: 'cedula',
        numeroDocumento: '12345',
      });
      expect(r.nivel).toBe('ok');
      expect(r.documentoObligatorio).toBe(true);
      expect(r.alertas).toHaveLength(0);
    });

    it('sin cédula: documento obligatorio y queda observado', () => {
      const r = validarJugador(LIBRE, {
        fechaNacimiento: nacimientoParaEdad(25, hoy),
      });
      expect(r.documentoObligatorio).toBe(true);
      expect(r.alertas.some((a) => a.includes('Documento de identidad obligatorio'))).toBe(true);
      expect(r.nivel).toBe('observado');
    });

    it('respeta edadMaxima null (Master solo tiene mínimo)', () => {
      const r = validarJugador(MASTER, {
        fechaNacimiento: nacimientoParaEdad(50, hoy),
        tipoDocumento: 'cedula',
        numeroDocumento: '12345',
      });
      expect(r.cumpleRango).toBe(true);
      expect(r.nivel).toBe('ok');
    });
  });

  // Comportamiento documentado: validarJugador NUNCA devuelve 'rechazado'
  // (el tipo lo permite, pero la implementación solo retorna 'ok' u 'observado').
  it('nunca devuelve "rechazado" con la implementación actual', () => {
    const casos = [
      validarJugador(LIBRE, { fechaNacimiento: nacimientoParaEdad(5, hoy) }),
      validarJugador(SUB10, { fechaNacimiento: nacimientoParaEdad(40, hoy) }),
    ];
    for (const r of casos) {
      expect(r.nivel).not.toBe('rechazado');
    }
  });
});
