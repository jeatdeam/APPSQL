import type { SqlValue } from 'sql.js'
import type { QueryResult } from './engine'

export interface GradeResult {
  correct: boolean
  message: string
}

// Normaliza para comparar: números con 2 decimales (evita 0.1+0.2), textos tal cual.
function norm(v: SqlValue): string {
  if (v == null) return '∅'
  if (typeof v === 'number') return `n:${Math.round(v * 100) / 100}`
  if (v instanceof Uint8Array) return `b:${v.length}`
  return `s:${v}`
}

const rowKey = (row: SqlValue[]) => row.map(norm).join('\u0001')
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
const sorted = (xs: string[]) => [...xs].sort()
const lower = (s: string) => s.toLowerCase()

// Mapea las columnas del usuario a las esperadas: por nombre si todas coinciden,
// si no, por posición (así un alias distinto no cuenta como error).
function alignColumns(expected: string[], actual: string[]): number[] {
  const byName = expected.map((c) => actual.map(lower).indexOf(lower(c)))
  return byName.every((i) => i >= 0) && new Set(byName).size === byName.length ? byName : expected.map((_, i) => i)
}

const uses = (sql: string, fn: string) => new RegExp(`\\b${fn}\\s*\\(`, 'i').test(sql)

export function grade(expected: QueryResult, actual: QueryResult | null, userSql: string, solutionSql: string, orderMatters: boolean): GradeResult {
  if (!actual) {
    return { correct: false, message: 'Tu consulta no devolvió ninguna tabla. ¿Escribiste un SELECT?' }
  }

  const expCols = expected.columns
  const actCols = actual.columns
  if (actCols.length < expCols.length) {
    const missing = expCols.filter((c) => !actCols.map(lower).includes(lower(c)))
    const which = missing.length && missing.length === expCols.length - actCols.length ? `: ${missing.join(', ')}` : ''
    return { correct: false, message: `Te faltan columnas (tienes ${actCols.length}, se esperaban ${expCols.length})${which}.` }
  }
  if (actCols.length > expCols.length) {
    const extra = actCols.filter((c) => !expCols.map(lower).includes(lower(c)))
    const which = extra.length && extra.length === actCols.length - expCols.length ? `: ${extra.join(', ')}` : ''
    return { correct: false, message: `Te sobran columnas${which}. Selecciona solo lo que pide el enunciado (evita SELECT *).` }
  }

  const map = alignColumns(expCols, actCols)
  const expRows = expected.rows.map(rowKey)
  const actRows = actual.rows.map((r) => rowKey(map.map((i) => r[i])))

  if (actRows.length > expRows.length) {
    return { correct: false, message: `Te sobran filas: tienes ${actRows.length} y se esperaban ${expRows.length}. ¿Falta alguna condición en WHERE o un DISTINCT?` }
  }
  if (actRows.length < expRows.length) {
    return { correct: false, message: `Te faltan filas: tienes ${actRows.length} y se esperaban ${expRows.length}. ¿El filtro es demasiado estricto? Revisa WHERE / HAVING y los JOIN.` }
  }

  const sameData = sameList(sorted(expRows), sorted(actRows))
  if (sameData) {
    if (orderMatters && !sameList(expRows, actRows)) {
      return { correct: false, message: 'Los datos están bien, pero el orden no. Revisa ORDER BY (¿ASC o DESC?).' }
    }
    return { correct: true, message: '¡Correcto! Tu consulta devuelve exactamente lo esperado.' }
  }

  // Misma forma, distintos valores: busca una pista concreta.
  if (uses(userSql, 'COUNT') && !uses(userSql, 'SUM') && uses(solutionSql, 'SUM')) {
    return { correct: false, message: '¿Usaste COUNT en vez de SUM? COUNT cuenta filas; SUM suma los valores de una columna.' }
  }
  if (uses(userSql, 'SUM') && !uses(userSql, 'COUNT') && uses(solutionSql, 'COUNT')) {
    return { correct: false, message: '¿Usaste SUM en vez de COUNT? SUM suma valores; COUNT cuenta cuántas filas hay.' }
  }
  for (let c = 0; c < expCols.length; c++) {
    const e = sorted(expected.rows.map((r) => norm(r[c])))
    const a = sorted(actual.rows.map((r) => norm(r[map[c]])))
    if (!sameList(e, a)) {
      return { correct: false, message: `Tienes las filas y columnas correctas, pero los valores de la columna ${actCols[map[c]]} no coinciden.` }
    }
  }
  return { correct: false, message: 'Los valores de cada columna son correctos, pero no están combinados como se espera. Revisa los JOIN.' }
}
