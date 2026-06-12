/**
 * Declaración de tipos para `embedded-postgres`.
 *
 * El paquete se publica como ESM (`"type": "module"`) con `exports` en forma
 * de string y sin campo `types`/`main`, así que el `moduleResolution: node`
 * (clásico, de un proyecto CommonJS) no encuentra sus declaraciones, aunque sí
 * trae `dist/index.d.ts`. En runtime, Node 22 carga el paquete vía
 * `require()` de ESM sin problema (verificado).
 *
 * Este shim cubre solo la superficie de la API que usa
 * `EmbeddedPostgresService`. Si se usan más métodos, ampliar acá.
 */
declare module 'embedded-postgres' {
  export interface EmbeddedPostgresOptions {
    databaseDir?: string;
    user?: string;
    password?: string;
    port?: number;
    persistent?: boolean;
    [key: string]: unknown;
  }

  export default class EmbeddedPostgres {
    constructor(options?: EmbeddedPostgresOptions);
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    createDatabase(name: string): Promise<void>;
    dropDatabase(name: string): Promise<void>;
  }
}
