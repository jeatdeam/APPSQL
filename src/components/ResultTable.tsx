import type { QueryResult } from '../sql/engine'

const MAX_ROWS = 500

export function ResultTable({ result, elapsedMs }: { result: QueryResult; elapsedMs?: number }) {
  const shown = result.rows.slice(0, MAX_ROWS)
  return (
    <div className="results">
      <div className="results-meta">
        {result.rows.length} {result.rows.length === 1 ? 'fila' : 'filas'}
        {elapsedMs != null && ` · ${elapsedMs.toFixed(1)} ms`}
        {result.rows.length > MAX_ROWS && ` · mostrando las primeras ${MAX_ROWS}`}
      </div>
      <div className="results-scroll">
        <table>
          <thead>
            <tr>
              {result.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r}>
                {row.map((v, c) => (
                  <td key={c} className={v == null ? 'null' : typeof v === 'number' ? 'num' : undefined}>
                    {v == null ? 'NULL' : v instanceof Uint8Array ? '(binario)' : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
