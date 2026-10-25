import type { Exercise, Level } from '../types'

export const levels: Level[] = [
  { id: 'select', name: 'Nivel 1', topic: 'SELECT · WHERE · LIKE' },
  { id: 'join', name: 'Nivel 2', topic: 'JOIN' },
  { id: 'group', name: 'Nivel 3', topic: 'GROUP BY · HAVING' },
  { id: 'count-sum', name: 'Nivel 4', topic: 'COUNT vs SUM' },
  { id: 'subquery', name: 'Nivel 5', topic: 'Subconsultas' },
]

export const exercises: Exercise[] = [
  {
    id: 'nw-clientes-mexico',
    levelId: 'select',
    title: 'Clientes de México',
    prompt: 'Muestra el nombre de la empresa (CompanyName) y la ciudad (City) de todos los clientes de México.',
    solution: "SELECT CompanyName, City\nFROM Customers\nWHERE Country = 'Mexico';",
    hints: [
      'Los clientes están en la tabla Customers.',
      "WHERE filtra fila por fila. Compara la columna Country con el texto 'Mexico' (entre comillas simples, sin tilde).",
    ],
    orderMatters: false,
  },
  {
    id: 'nw-productos-ch',
    levelId: 'select',
    title: 'Productos que empiezan con "Ch"',
    prompt: 'Muestra el nombre (ProductName) y el precio (UnitPrice) de los productos cuyo nombre empieza con "Ch".',
    solution: "SELECT ProductName, UnitPrice\nFROM Products\nWHERE ProductName LIKE 'Ch%';",
    hints: [
      'Para buscar por un patrón de texto se usa LIKE.',
      "El comodín % significa \"cualquier cosa\". 'Ch%' = empieza con Ch.",
    ],
    orderMatters: false,
  },
  {
    id: 'nw-productos-seafood',
    levelId: 'join',
    title: 'Productos del mar',
    prompt: 'Muestra el nombre de cada producto (ProductName) junto al nombre de su categoría (CategoryName), solo para la categoría "Seafood".',
    solution: "SELECT p.ProductName, c.CategoryName\nFROM Products p\nJOIN Categories c ON p.CategoryID = c.CategoryID\nWHERE c.CategoryName = 'Seafood';",
    hints: [
      'El nombre de la categoría no está en Products: está en Categories. Necesitas un JOIN.',
      'Las dos tablas se unen por CategoryID: ... JOIN Categories c ON p.CategoryID = c.CategoryID',
    ],
    orderMatters: false,
  },
  {
    id: 'nw-pedidos-empleado-2025',
    levelId: 'group',
    title: 'Los más vendedores de 2025',
    prompt: 'Muestra el nombre (FirstName), el apellido (LastName) y la cantidad de pedidos de cada empleado en el año 2025. Solo los empleados con más de 50 pedidos ese año.',
    solution:
      'SELECT e.FirstName, e.LastName, COUNT(*) AS Pedidos\nFROM Orders o\nJOIN Employees e ON o.EmployeeID = e.EmployeeID\nWHERE YEAR(o.OrderDate) = 2025\nGROUP BY e.EmployeeID, e.FirstName, e.LastName\nHAVING COUNT(*) > 50;',
    hints: [
      'Une Orders con Employees por EmployeeID y agrupa por empleado.',
      'WHERE filtra filas ANTES de agrupar: úsalo para el año, con YEAR(o.OrderDate) = 2025.',
      'HAVING filtra DESPUÉS de GROUP BY, con agregaciones: HAVING COUNT(*) > 50.',
    ],
    orderMatters: false,
  },
  {
    id: 'nw-unidades-categoria',
    levelId: 'count-sum',
    title: 'Jefe: unidades por categoría',
    prompt:
      'Muestra cada categoría (CategoryName) y el total de UNIDADES vendidas (suma de Quantity en [Order Details]), ordenado de la que más vendió a la que menos.',
    solution:
      'SELECT c.CategoryName, SUM(od.Quantity) AS Unidades\nFROM [Order Details] od\nJOIN Products p ON od.ProductID = p.ProductID\nJOIN Categories c ON p.CategoryID = c.CategoryID\nGROUP BY c.CategoryName\nORDER BY Unidades DESC;',
    hints: [
      'Necesitas tres tablas: [Order Details] → Products → Categories.',
      'COUNT(*) cuenta líneas de pedido; SUM(od.Quantity) suma las unidades. ¿Cuál pide el enunciado?',
      'Para ordenar de mayor a menor: ORDER BY ... DESC.',
    ],
    orderMatters: true,
    boss: true,
  },
]
