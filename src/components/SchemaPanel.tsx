import { useState } from 'react'
import type { TableInfo } from '../sql/engine'

export function SchemaPanel({ schema }: { schema?: TableInfo[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const table = schema?.find((t) => t.name === open)

  return (
    <footer className="schema">
      <div className="schema-tables">
        <span className="schema-label">Tablas:</span>
        {schema?.map((t) => (
          <button
            key={t.name}
            className={`table-chip${t.name === open ? ' active' : ''}`}
            onClick={() => setOpen(t.name === open ? null : t.name)}
            aria-expanded={t.name === open}
          >
            {t.name.includes(' ') ? `[${t.name}]` : t.name}
          </button>
        ))}
      </div>
      {table && (
        <ul className="schema-columns">
          {table.columns.map((c) => (
            <li key={c.name}>
              {c.primaryKey && <span title="Clave primaria">🔑 </span>}
              <span className="col-name">{c.name}</span> <span className="col-type">{c.type || 'ANY'}</span>
              {c.references && <span className="col-ref"> → {c.references.includes(' ') ? `[${c.references}]` : c.references}</span>}
            </li>
          ))}
        </ul>
      )}
    </footer>
  )
}
