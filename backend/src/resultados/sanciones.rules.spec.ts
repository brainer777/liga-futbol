import { aplicarFechaCumplida } from './sanciones.rules';

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
