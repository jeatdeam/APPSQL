import { useEffect, useState } from 'react'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { SqlEngine, type TableInfo } from '../sql/engine'
import type { DatabaseDef } from '../themes/types'

let sqlJs: Promise<SqlJsStatic> | null = null
const engines = new Map<string, Promise<SqlEngine>>()

function loadEngine(db: DatabaseDef): Promise<SqlEngine> {
  let engine = engines.get(db.id)
  if (!engine) {
    sqlJs ??= initSqlJs({ locateFile: () => wasmUrl })
    engine = Promise.all([
      sqlJs,
      fetch(`${import.meta.env.BASE_URL}${db.url}`).then((r) => {
        if (!r.ok) throw new Error(`No se pudo descargar la base ${db.name} (${r.status})`)
        return r.text()
      }),
    ]).then(([SQL, script]) => new SqlEngine(SQL, script))
    engine.catch(() => engines.delete(db.id))
    engines.set(db.id, engine)
  }
  return engine
}

interface EngineState {
  engine?: SqlEngine
  schema?: TableInfo[]
  error?: string
}

export function useEngine(db: DatabaseDef): EngineState {
  const [state, setState] = useState<EngineState & { id?: string }>({})

  useEffect(() => {
    let alive = true
    loadEngine(db)
      .then((engine) => alive && setState({ id: db.id, engine, schema: engine.schema() }))
      .catch((e) => alive && setState({ id: db.id, error: String(e.message ?? e) }))
    return () => {
      alive = false
    }
  }, [db])

  // Mientras carga otra base, no devolver el motor de la anterior.
  return state.id === db.id ? state : {}
}
