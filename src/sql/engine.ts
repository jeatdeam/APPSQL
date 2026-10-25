import type { Database, SqlJsStatic, SqlValue } from 'sql.js'
import { translateTSql, UnsupportedSqlError } from './translate'
import { detectUnsupported, friendlyError } from './errors'

export interface QueryResult {
  columns: string[]
  rows: SqlValue[][]
}

export type RunOutcome =
  | { ok: true; result: QueryResult | null; elapsedMs: number }
  | { ok: false; error: string }

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/

function datePart(index: 1 | 2 | 3) {
  return (value: SqlValue) => {
    if (value == null) return null
    const m = DATE_RE.exec(String(value))
    return m ? Number(m[index]) : null
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

// Funciones de SQL Server que SQLite no trae.
function registerSqlServerFunctions(db: Database) {
  db.create_function('YEAR', datePart(1))
  db.create_function('MONTH', datePart(2))
  db.create_function('DAY', datePart(3))
  db.create_function('GETDATE', () => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  })
  // LEN de SQL Server ignora los espacios finales.
  db.create_function('LEN', (value: SqlValue) => (value == null ? null : String(value).replace(/\s+$/, '').length))
  // ISNULL() se traduce a IFNULL() en translate.ts.
}

// Una base cargada. Cada ejecución usa una copia nueva, así un DELETE o DROP del usuario
// nunca rompe la base para la siguiente consulta.
export class SqlEngine {
  private readonly SQL: SqlJsStatic
  private readonly snapshot: Uint8Array

  constructor(SQL: SqlJsStatic, script: string) {
    this.SQL = SQL
    const db = new SQL.Database()
    db.exec(script)
    this.snapshot = db.export()
    db.close()
  }

  private open(): Database {
    const db = new this.SQL.Database(this.snapshot)
    registerSqlServerFunctions(db)
    return db
  }

  run(sql: string): RunOutcome {
    if (!sql.trim()) return { ok: false, error: 'Escribe una consulta primero.' }
    const unsupported = detectUnsupported(sql)
    if (unsupported) return { ok: false, error: unsupported }

    let translated: string
    try {
      translated = translateTSql(sql)
    } catch (e) {
      if (e instanceof UnsupportedSqlError) return { ok: false, error: e.message }
      throw e
    }

    const db = this.open()
    try {
      const start = performance.now()
      const results = db.exec(translated)
      const elapsedMs = performance.now() - start
      const last = results.at(-1)
      return { ok: true, result: last ? { columns: last.columns, rows: last.values } : null, elapsedMs }
    } catch (e) {
      return { ok: false, error: friendlyError(String((e as Error).message ?? e)) }
    } finally {
      db.close()
    }
  }

  // Tablas y columnas, para el panel inferior y el autocompletado.
  schema(): TableInfo[] {
    const db = this.open()
    try {
      const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      return (tables[0]?.values ?? []).map(([name]) => {
        const info = db.exec(`PRAGMA table_info("${name}")`)[0]
        const fks = db.exec(`PRAGMA foreign_key_list("${name}")`)[0]
        const fkCols = new Map((fks?.values ?? []).map((r) => [String(r[3]), String(r[2])]))
        return {
          name: String(name),
          columns: (info?.values ?? []).map((r) => ({
            name: String(r[1]),
            type: String(r[2]),
            primaryKey: Number(r[5]) > 0,
            references: fkCols.get(String(r[1])),
          })),
        }
      })
    } finally {
      db.close()
    }
  }
}

export interface ColumnInfo {
  name: string
  type: string
  primaryKey: boolean
  references?: string
}

export interface TableInfo {
  name: string
  columns: ColumnInfo[]
}
