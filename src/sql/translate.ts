// Traduce construcciones de SQL Server que SQLite no entiende.
// - SELECT [DISTINCT] TOP n ... → SELECT [DISTINCT] ... LIMIT n
// - ISNULL(a, b) → IFNULL(a, b)

export class UnsupportedSqlError extends Error {}

interface Token {
  kind: 'word' | 'number' | 'open' | 'close' | 'semicolon' | 'other'
  text: string
  start: number
  end: number
}

// Tokenizador mínimo: ignora strings, identificadores entre [] o "" y comentarios.
function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const start = i
    if (/\s/.test(ch)) { i++; continue }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2)
      i = close === -1 ? sql.length : close + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '[') {
      const closer = ch === '[' ? ']' : ch
      i++
      while (i < sql.length) {
        if (sql[i] === closer) {
          if (closer !== ']' && sql[i + 1] === closer) { i += 2; continue }
          i++
          break
        }
        i++
      }
      tokens.push({ kind: 'other', text: sql.slice(start, i), start, end: i })
      continue
    }
    if (/[A-Za-z_@#]/.test(ch)) {
      while (i < sql.length && /[\w@#$]/.test(sql[i])) i++
      tokens.push({ kind: 'word', text: sql.slice(start, i), start, end: i })
      continue
    }
    if (/\d/.test(ch)) {
      while (i < sql.length && /[\d.]/.test(sql[i])) i++
      tokens.push({ kind: 'number', text: sql.slice(start, i), start, end: i })
      continue
    }
    const kind = ch === '(' ? 'open' : ch === ')' ? 'close' : ch === ';' ? 'semicolon' : 'other'
    tokens.push({ kind, text: ch, start, end: i + 1 })
    i++
  }
  return tokens
}

const isWord = (t: Token | undefined, w: string) => t?.kind === 'word' && t.text.toUpperCase() === w

export function translateTSql(sql: string): string {
  const tokens = tokenize(sql)
  // Ediciones a aplicar sobre el texto original: [inicio, fin, reemplazo]
  const edits: [number, number, string][] = []

  for (let k = 0; k < tokens.length; k++) {
    if (!isWord(tokens[k], 'SELECT')) continue
    let j = k + 1
    if (isWord(tokens[j], 'DISTINCT') || isWord(tokens[j], 'ALL')) j++
    if (!isWord(tokens[j], 'TOP')) continue

    const topStart = tokens[j].start
    let n: string | undefined
    let after = j + 1
    if (tokens[after]?.kind === 'open' && tokens[after + 1]?.kind === 'number' && tokens[after + 2]?.kind === 'close') {
      n = tokens[after + 1].text
      after += 3
    } else if (tokens[after]?.kind === 'number') {
      n = tokens[after].text
      after += 1
    }
    if (!n || !/^\d+$/.test(n)) {
      throw new UnsupportedSqlError('TOP necesita un número entero, por ejemplo: SELECT TOP 5 ...')
    }
    if (isWord(tokens[after], 'PERCENT')) {
      throw new UnsupportedSqlError('TOP ... PERCENT no está soportado aquí. Usa TOP n con un número de filas.')
    }
    if (isWord(tokens[after], 'WITH')) {
      throw new UnsupportedSqlError('TOP ... WITH TIES no está soportado aquí.')
    }

    // Fin del SELECT: el ")" que cierra su nivel, el ";" o el final del texto.
    let depth = 0
    let end = sql.length
    for (let m = after; m < tokens.length; m++) {
      const t = tokens[m]
      if (t.kind === 'open') depth++
      else if (t.kind === 'close') {
        if (depth === 0) { end = t.start; break }
        depth--
      } else if (t.kind === 'semicolon' && depth === 0) { end = t.start; break }
    }
    // Retrocede sobre espacios para que el LIMIT quede pegado a la consulta.
    let insertAt = end
    while (insertAt > 0 && /\s/.test(sql[insertAt - 1])) insertAt--
    let topEnd = tokens[after - 1].end
    while (/\s/.test(sql[topEnd] ?? '')) topEnd++
    edits.push([topStart, topEnd, ''])
    edits.push([insertAt, insertAt, ` LIMIT ${n}`])
  }

  // ISNULL(a, b) de SQL Server = IFNULL(a, b). En SQLite ISNULL es un operador, no una función.
  for (let k = 0; k < tokens.length; k++) {
    if (isWord(tokens[k], 'ISNULL') && tokens[k + 1]?.kind === 'open') {
      edits.push([tokens[k].start, tokens[k].end, 'IFNULL'])
    }
  }

  if (!edits.length) return sql
  // Aplica de atrás hacia adelante para no desplazar posiciones.
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1])
  let out = sql
  for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e)
  return out
}
