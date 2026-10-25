// Convierte el script oficial de Northwind para SQL Server (instnwnd.sql, MIT, Microsoft)
// a un script SQLite en public/db/northwind.sql.
// Todas las fechas se mueven +28 años (1996–1998 → 2024–2026): conserva día de semana y bisiestos.
//
// Uso: node scripts/build-northwind.mjs ruta/a/instnwnd.sql
// Fuente: https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const YEAR_SHIFT = 28
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = process.argv[2]
if (!input) {
  console.error('Uso: node scripts/build-northwind.mjs ruta/a/instnwnd.sql')
  process.exit(1)
}
const src = readFileSync(input, 'utf8')

// Esquema SQLite. El orden de las columnas define el orden de los INSERT generados.
const SCHEMA = {
  Categories: {
    ddl: `CREATE TABLE Categories (
  CategoryID INTEGER PRIMARY KEY,
  CategoryName TEXT NOT NULL,
  Description TEXT
);`,
    columns: ['CategoryID', 'CategoryName', 'Description'],
  },
  Customers: {
    ddl: `CREATE TABLE Customers (
  CustomerID TEXT PRIMARY KEY,
  CompanyName TEXT NOT NULL,
  ContactName TEXT,
  ContactTitle TEXT,
  Address TEXT,
  City TEXT,
  Region TEXT,
  PostalCode TEXT,
  Country TEXT,
  Phone TEXT,
  Fax TEXT
);`,
    columns: ['CustomerID', 'CompanyName', 'ContactName', 'ContactTitle', 'Address', 'City', 'Region', 'PostalCode', 'Country', 'Phone', 'Fax'],
  },
  Employees: {
    ddl: `CREATE TABLE Employees (
  EmployeeID INTEGER PRIMARY KEY,
  LastName TEXT NOT NULL,
  FirstName TEXT NOT NULL,
  Title TEXT,
  TitleOfCourtesy TEXT,
  BirthDate TEXT,
  HireDate TEXT,
  Address TEXT,
  City TEXT,
  Region TEXT,
  PostalCode TEXT,
  Country TEXT,
  HomePhone TEXT,
  Extension TEXT,
  Notes TEXT,
  ReportsTo INTEGER REFERENCES Employees(EmployeeID)
);`,
    columns: ['EmployeeID', 'LastName', 'FirstName', 'Title', 'TitleOfCourtesy', 'BirthDate', 'HireDate', 'Address', 'City', 'Region', 'PostalCode', 'Country', 'HomePhone', 'Extension', 'Notes', 'ReportsTo'],
    dates: ['BirthDate', 'HireDate'],
  },
  Shippers: {
    ddl: `CREATE TABLE Shippers (
  ShipperID INTEGER PRIMARY KEY,
  CompanyName TEXT NOT NULL,
  Phone TEXT
);`,
    columns: ['ShipperID', 'CompanyName', 'Phone'],
  },
  Suppliers: {
    ddl: `CREATE TABLE Suppliers (
  SupplierID INTEGER PRIMARY KEY,
  CompanyName TEXT NOT NULL,
  ContactName TEXT,
  ContactTitle TEXT,
  Address TEXT,
  City TEXT,
  Region TEXT,
  PostalCode TEXT,
  Country TEXT,
  Phone TEXT,
  Fax TEXT,
  HomePage TEXT
);`,
    columns: ['SupplierID', 'CompanyName', 'ContactName', 'ContactTitle', 'Address', 'City', 'Region', 'PostalCode', 'Country', 'Phone', 'Fax', 'HomePage'],
  },
  Products: {
    ddl: `CREATE TABLE Products (
  ProductID INTEGER PRIMARY KEY,
  ProductName TEXT NOT NULL,
  SupplierID INTEGER REFERENCES Suppliers(SupplierID),
  CategoryID INTEGER REFERENCES Categories(CategoryID),
  QuantityPerUnit TEXT,
  UnitPrice REAL DEFAULT 0,
  UnitsInStock INTEGER DEFAULT 0,
  UnitsOnOrder INTEGER DEFAULT 0,
  ReorderLevel INTEGER DEFAULT 0,
  Discontinued INTEGER NOT NULL DEFAULT 0
);`,
    columns: ['ProductID', 'ProductName', 'SupplierID', 'CategoryID', 'QuantityPerUnit', 'UnitPrice', 'UnitsInStock', 'UnitsOnOrder', 'ReorderLevel', 'Discontinued'],
  },
  Orders: {
    ddl: `CREATE TABLE Orders (
  OrderID INTEGER PRIMARY KEY,
  CustomerID TEXT REFERENCES Customers(CustomerID),
  EmployeeID INTEGER REFERENCES Employees(EmployeeID),
  OrderDate TEXT,
  RequiredDate TEXT,
  ShippedDate TEXT,
  ShipVia INTEGER REFERENCES Shippers(ShipperID),
  Freight REAL DEFAULT 0,
  ShipName TEXT,
  ShipAddress TEXT,
  ShipCity TEXT,
  ShipRegion TEXT,
  ShipPostalCode TEXT,
  ShipCountry TEXT
);`,
    columns: ['OrderID', 'CustomerID', 'EmployeeID', 'OrderDate', 'RequiredDate', 'ShippedDate', 'ShipVia', 'Freight', 'ShipName', 'ShipAddress', 'ShipCity', 'ShipRegion', 'ShipPostalCode', 'ShipCountry'],
    dates: ['OrderDate', 'RequiredDate', 'ShippedDate'],
  },
  'Order Details': {
    ddl: `CREATE TABLE [Order Details] (
  OrderID INTEGER NOT NULL REFERENCES Orders(OrderID),
  ProductID INTEGER NOT NULL REFERENCES Products(ProductID),
  UnitPrice REAL NOT NULL DEFAULT 0,
  Quantity INTEGER NOT NULL DEFAULT 1,
  Discount REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (OrderID, ProductID)
);`,
    columns: ['OrderID', 'ProductID', 'UnitPrice', 'Quantity', 'Discount'],
  },
}

// Lee una tupla de valores T-SQL empezando justo después del "(" de VALUES.
function readTuple(text, start) {
  const values = []
  let i = start
  while (true) {
    while (/\s/.test(text[i])) i++
    if (text[i] === "'" || (text[i] === 'N' && text[i + 1] === "'")) {
      if (text[i] === 'N') i++
      i++
      let s = ''
      while (true) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { s += "'"; i += 2; continue }
          i++
          break
        }
        s += text[i++]
      }
      values.push(s)
    } else {
      let j = i
      while (text[j] !== ',' && text[j] !== ')') j++
      const raw = text.slice(i, j).trim()
      if (/^null$/i.test(raw)) values.push(null)
      else if (/^0x/i.test(raw)) values.push(undefined) // imágenes binarias: se descartan
      else if (/^-?\d+(\.\d+)?$/.test(raw)) values.push(Number(raw))
      else throw new Error(`Valor no reconocido: ${raw.slice(0, 40)}`)
      i = j
    }
    while (/\s/.test(text[i])) i++
    if (text[i] === ',') { i++; continue }
    if (text[i] === ')') return values
    throw new Error(`Se esperaba , o ) en la posición ${i}`)
  }
}

// Columnas en el orden del CREATE TABLE original (para INSERT sin lista de columnas).
const originalColumns = {
  Customers: SCHEMA.Customers.columns,
  'Order Details': SCHEMA['Order Details'].columns,
}

function shiftDate(value) {
  if (value == null) return null
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (!m) throw new Error(`Fecha no reconocida: ${value}`)
  const [, mm, dd, yyyy] = m
  return `${Number(yyyy) + YEAR_SHIFT}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function sqlLiteral(v) {
  if (v == null) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${v.replace(/'/g, "''")}'`
}

const rows = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, []]))
const re = /INSERT\s+(?:INTO\s+)?"([^"]+)"\s*(?:\(([^)]*)\))?\s*VALUES\s*\(/g
let match
while ((match = re.exec(src))) {
  const table = match[1]
  if (!SCHEMA[table]) continue
  const cols = match[2]
    ? match[2].split(',').map((c) => c.trim().replace(/"/g, ''))
    : originalColumns[table]
  if (!cols) throw new Error(`INSERT sin columnas para ${table}`)
  const values = readTuple(src, re.lastIndex)
  if (values.length !== cols.length) throw new Error(`Columnas/valores no cuadran en ${table}`)
  const record = Object.fromEntries(cols.map((c, k) => [c, values[k]]))
  for (const d of SCHEMA[table].dates ?? []) record[d] = shiftDate(record[d])
  rows[table].push(record)
}

const tableName = (t) => (t.includes(' ') ? `[${t}]` : t)
let out = `-- Northwind para SQLite (generado por scripts/build-northwind.mjs)
-- Datos: Microsoft sql-server-samples (MIT). Fechas movidas +${YEAR_SHIFT} años.
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
`
for (const [table, def] of Object.entries(SCHEMA)) {
  out += `\n${def.ddl}\n`
  for (const r of rows[table]) {
    out += `INSERT INTO ${tableName(table)} VALUES(${def.columns.map((c) => sqlLiteral(r[c])).join(',')});\n`
  }
}
out += '\nCOMMIT;\nPRAGMA foreign_keys = ON;\n'

const dest = resolve(root, 'public/db/northwind.sql')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, out)
for (const t of Object.keys(SCHEMA)) console.log(`${t}: ${rows[t].length} filas`)
console.log(`→ ${dest}`)
