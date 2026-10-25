import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { SqlEngine } from './engine'
import { translateTSql } from './translate'
import { grade } from './grade'
import { exercises } from '../themes/dracula/exercises'

let nw: SqlEngine

beforeAll(async () => {
  const SQL = await initSqlJs()
  nw = new SqlEngine(SQL, readFileSync('public/db/northwind.sql', 'utf8'))
})

function query(sql: string) {
  const out = nw.run(sql)
  if (!out.ok) throw new Error(out.error)
  return out.result!
}

describe('translateTSql', () => {
  it('convierte TOP n en LIMIT n', () => {
    expect(translateTSql('SELECT TOP 5 * FROM Products ORDER BY UnitPrice DESC;')).toBe('SELECT * FROM Products ORDER BY UnitPrice DESC LIMIT 5;')
  })
  it('respeta DISTINCT y TOP (n)', () => {
    expect(translateTSql('SELECT DISTINCT TOP (3) Country FROM Customers')).toBe('SELECT DISTINCT Country FROM Customers LIMIT 3')
  })
  it('traduce TOP dentro de una subconsulta', () => {
    expect(translateTSql('SELECT * FROM Products WHERE ProductID IN (SELECT TOP 2 ProductID FROM Products ORDER BY UnitPrice)')).toBe(
      'SELECT * FROM Products WHERE ProductID IN (SELECT ProductID FROM Products ORDER BY UnitPrice LIMIT 2)',
    )
  })
  it('no toca TOP dentro de textos', () => {
    const sql = "SELECT 'SELECT TOP 1' AS x"
    expect(translateTSql(sql)).toBe(sql)
  })
  it('rechaza TOP PERCENT', () => {
    expect(() => translateTSql('SELECT TOP 10 PERCENT * FROM Orders')).toThrow(/PERCENT/)
  })
})

describe('SqlEngine', () => {
  it('tiene las fechas movidas +28 años', () => {
    const r = query('SELECT MIN(OrderDate), MAX(OrderDate) FROM Orders')
    expect(r.rows[0]).toEqual(['2024-07-04', '2026-05-06'])
  })
  it('soporta YEAR, MONTH, DAY, LEN e ISNULL', () => {
    const r = query("SELECT YEAR(OrderDate), MONTH(OrderDate), DAY(OrderDate), LEN('hola  '), ISNULL(NULL, 'x') FROM Orders WHERE OrderID = 10248")
    expect(r.rows[0]).toEqual([2024, 7, 4, 4, 'x'])
  })
  it('acepta [Order Details] y TOP', () => {
    expect(query('SELECT TOP 3 * FROM [Order Details]').rows).toHaveLength(3)
  })
  it('cada consulta usa una copia limpia de la base', () => {
    nw.run('DELETE FROM Customers')
    expect(query('SELECT COUNT(*) FROM Customers').rows[0][0]).toBe(91)
  })
  it('da mensajes claros', () => {
    const tabla = nw.run('SELECT * FROM Clientes')
    expect(!tabla.ok && tabla.error).toMatch(/La tabla Clientes no existe/)
    const agg = nw.run('SELECT CustomerID FROM Orders WHERE COUNT(*) > 5 GROUP BY CustomerID')
    expect(!agg.ok && agg.error).toMatch(/HAVING/)
    const fn = nw.run('SELECT DATEDIFF(day, OrderDate, ShippedDate) FROM Orders')
    expect(!fn.ok && fn.error).toMatch(/no está soportada/)
  })
})

describe('grade', () => {
  const ex = exercises.find((e) => e.id === 'nw-unidades-categoria')!
  const expected = () => query(ex.solution)
  const check = (sql: string) => grade(expected(), query(sql), sql, ex.solution, ex.orderMatters)

  it('acepta la solución con otros alias', () => {
    const sql = 'SELECT c.CategoryName, SUM(d.Quantity) AS Total FROM [Order Details] d JOIN Products p ON d.ProductID = p.ProductID JOIN Categories c ON c.CategoryID = p.CategoryID GROUP BY c.CategoryName ORDER BY 2 DESC'
    expect(check(sql).correct).toBe(true)
  })
  it('detecta COUNT en vez de SUM', () => {
    const sql = 'SELECT c.CategoryName, COUNT(*) FROM [Order Details] d JOIN Products p ON d.ProductID = p.ProductID JOIN Categories c ON c.CategoryID = p.CategoryID GROUP BY c.CategoryName ORDER BY 2 DESC'
    expect(check(sql).message).toMatch(/COUNT en vez de SUM/)
  })
  it('detecta orden incorrecto', () => {
    const sql = 'SELECT c.CategoryName, SUM(d.Quantity) FROM [Order Details] d JOIN Products p ON d.ProductID = p.ProductID JOIN Categories c ON c.CategoryID = p.CategoryID GROUP BY c.CategoryName ORDER BY 2'
    expect(check(sql).message).toMatch(/orden/)
  })
  it('detecta filas y columnas de más o de menos', () => {
    const mx = exercises[0]
    const g = (sql: string) => grade(query(mx.solution), query(sql), sql, mx.solution, false)
    expect(g('SELECT CompanyName, City FROM Customers').message).toMatch(/sobran filas/)
    expect(g("SELECT CompanyName FROM Customers WHERE Country = 'Mexico'").message).toMatch(/faltan columnas.*City/)
    expect(g("SELECT * FROM Customers WHERE Country = 'Mexico'").message).toMatch(/sobran columnas/)
  })
})

describe('ejercicios de Northwind', () => {
  it.each(exercises.map((e) => [e.id, e] as const))('%s: la solución funciona y devuelve filas', (_, ex) => {
    const r = query(ex.solution)
    expect(r.rows.length).toBeGreaterThan(0)
    expect(grade(r, r, ex.solution, ex.solution, ex.orderMatters).correct).toBe(true)
  })
})
