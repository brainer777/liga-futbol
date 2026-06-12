/**
 * Utilidades para generar CSV seguro.
 *
 * Dos riesgos que se manejan acá:
 *  1. Escape estándar de CSV: campos con coma, comillas o saltos de línea se
 *     entrecomillan y las comillas internas se duplican.
 *  2. CSV / formula injection: una celda de TEXTO que empieza con = + - @ (o
 *     tab/CR) puede ejecutarse como fórmula en Excel/Sheets. Se neutraliza
 *     anteponiendo una comilla simple.
 *
 * IMPORTANTE: el guard anti-fórmula se aplica SOLO a texto. Los números se
 * emiten crudos —si no, una diferencia de goles -5 se convertiría en el texto
 * "'-5" y rompería el ordenamiento/visualización en Excel.
 */

export type CsvCell = string | number | null | undefined;

const BOM = '﻿';

function field(v: CsvCell): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let s = String(v);
  // 1) Neutralizar inyección de fórmulas (solo texto)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // 2) Escape CSV
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: CsvCell[]): string {
  return cells.map(field).join(',');
}

/**
 * Construye un CSV completo: BOM UTF-8 (para que Excel muestre acentos) +
 * encabezados + filas, separadas por CRLF.
 */
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [row(headers), ...rows.map(row)];
  return BOM + lines.join('\r\n') + '\r\n';
}
