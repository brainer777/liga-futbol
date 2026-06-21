import {
  aplicarFechaCumplida,
  estaSuspendida,
  habilitacionBloquea,
} from './sanciones.rules';

describe('aplicarFechaCumplida', () => {
  it('descuenta una fecha sin cerrar si todavía faltan', () => {
    const r = aplicarFechaCumplida({ fechasCumplidas: 0, fechasCumplir: 2 });
    expect(r).toEqual({ fechasCumplidas: 1 });
    expect(r.estado).toBeUndefined();
  });

  it('marca como cumplida al alcanzar el tope', () => {
    const r = aplicarFechaCumplida({ fechasCumplidas: 1, fechasCumplir: 2 });
    expect(r).toEqual({ fechasCumplidas: 2, estado: 'cumplida' });
  });

  it('una sanción de 1 fecha se cumple en un solo partido', () => {
    const r = aplicarFechaCumplida({ fechasCumplidas: 0, fechasCumplir: 1 });
    expect(r).toEqual({ fechasCumplidas: 1, estado: 'cumplida' });
  });

  it('no se pasa del tope si por algún motivo ya estaba al límite', () => {
    const r = aplicarFechaCumplida({ fechasCumplidas: 2, fechasCumplir: 2 });
    expect(r).toEqual({ fechasCumplidas: 3, estado: 'cumplida' });
  });
});

describe('estaSuspendida', () => {
  it('bloquea una sanción pendiente con fechas por cumplir', () => {
    expect(estaSuspendida({ estado: 'pendiente', fechasCumplidas: 0, fechasCumplir: 2 })).toBe(true);
    expect(estaSuspendida({ estado: 'pendiente', fechasCumplidas: 1, fechasCumplir: 2 })).toBe(true);
  });

  it('no bloquea cuando ya cumplió todas las fechas', () => {
    expect(estaSuspendida({ estado: 'pendiente', fechasCumplidas: 2, fechasCumplir: 2 })).toBe(false);
  });

  it('no bloquea estados no pendientes', () => {
    expect(estaSuspendida({ estado: 'cumplida', fechasCumplidas: 2, fechasCumplir: 2 })).toBe(false);
    expect(estaSuspendida({ estado: 'condonada', fechasCumplidas: 0, fechasCumplir: 2 })).toBe(false);
    expect(estaSuspendida({ estado: 'anulada', fechasCumplidas: 0, fechasCumplir: 2 })).toBe(false);
  });
});

describe('habilitacionBloquea', () => {
  it('bloquea solo los estados negativos', () => {
    expect(habilitacionBloquea('rechazado')).toBe(true);
    expect(habilitacionBloquea('suspendido')).toBe(true);
  });

  it('deja pasar pendiente, observado y habilitado', () => {
    expect(habilitacionBloquea('habilitado')).toBe(false);
    expect(habilitacionBloquea('pendiente')).toBe(false);
    expect(habilitacionBloquea('observado')).toBe(false);
  });
});
