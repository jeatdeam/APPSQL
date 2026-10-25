// Convierte errores crudos de SQLite en mensajes claros para estudiantes.

export const SUPPORTED_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'UPPER', 'LOWER', 'SUBSTR',
  'YEAR', 'MONTH', 'DAY', 'GETDATE', 'LEN', 'ISNULL', 'COALESCE',
]

export function friendlyError(raw: string): string {
  const msg = raw.replace(/^Error:\s*/, '')
  let m: RegExpExecArray | null

  if ((m = /no such table: (.+)/i.exec(msg))) {
    return `La tabla ${m[1]} no existe en esta base. Revisa el nombre en el panel de tablas de abajo.`
  }
  if ((m = /no such column: (.+)/i.exec(msg))) {
    return `La columna ${m[1]} no existe. Revisa cómo se escribe o de qué tabla viene (haz clic en la tabla de abajo para ver sus columnas).`
  }
  if ((m = /no such function: (.+)/i.exec(msg))) {
    return `La función ${m[1].toUpperCase()}() no está soportada en este simulador. Puedes usar: ${SUPPORTED_FUNCTIONS.join(', ')}.`
  }
  if ((m = /ambiguous column name: (.+)/i.exec(msg))) {
    return `La columna ${m[1]} es ambigua: existe en más de una tabla del JOIN. Escribe tabla.${m[1]} o usa un alias (por ejemplo o.${m[1]}).`
  }
  if (/misuse of aggregate/i.test(msg)) {
    return 'No puedes usar una función de agregación (COUNT, SUM, AVG...) en WHERE. WHERE filtra fila por fila antes de agrupar; para filtrar por un total usa HAVING después de GROUP BY.'
  }
  if (/aggregate functions are not allowed in the GROUP BY/i.test(msg)) {
    return 'No puedes poner una función de agregación dentro de GROUP BY. Agrupa por columnas y usa COUNT/SUM en el SELECT.'
  }
  if ((m = /near "(.+?)": syntax error/i.exec(msg))) {
    return `Error de sintaxis cerca de "${m[1]}". Revisa comas, paréntesis y el orden de las cláusulas: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY.`
  }
  if (/incomplete input/i.test(msg)) {
    return 'La consulta está incompleta. ¿Falta cerrar un paréntesis o una comilla?'
  }
  if (/unrecognized token/i.test(msg)) {
    return `Hay un símbolo que no se reconoce (${msg.replace(/.*unrecognized token:\s*/i, '')}). ¿Una comilla sin cerrar? Los textos van entre comillas simples: 'texto'.`
  }
  return `Error: ${msg}`
}

// Detecta T-SQL que no tiene equivalente aquí, antes de ejecutar.
export function detectUnsupported(sql: string): string | null {
  const code = sql.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$/gm, '')
  if (/\bDECLARE\b|@\w+/i.test(code)) return 'Las variables (DECLARE, @variable) no están soportadas en este simulador. Escribe el valor directamente en la consulta.'
  if (/^\s*GO\s*$/im.test(code)) return 'GO no es SQL, es un separador de SQL Server Management Studio. Quítalo.'
  if (/\b(DATEPART|DATEDIFF|DATEADD|CONVERT|FORMAT|CHARINDEX)\s*\(/i.test(code)) {
    const fn = /\b(DATEPART|DATEDIFF|DATEADD|CONVERT|FORMAT|CHARINDEX)\s*\(/i.exec(code)![1].toUpperCase()
    return `${fn}() todavía no está soportada aquí. Para fechas puedes usar YEAR(), MONTH() y DAY().`
  }
  return null
}
