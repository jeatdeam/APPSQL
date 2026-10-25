# APPSQL

App web para practicar SQL (nivel estudiante, estilo SQL Server / Northwind).
Escribes una consulta, la ejecutas y la app te dice si está bien comparándola con la solución.
Todo corre en el navegador: sin backend ni login.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor SQL, la corrección y los ejercicios
npm run build    # build estático en dist/
```

## Cómo funciona

- **Motor:** [sql.js](https://sql.js.org) (SQLite en WebAssembly). Cada consulta corre sobre una copia limpia de la base.
- **Compatibilidad SQL Server** (`src/sql/`): `TOP n` → `LIMIT n`, `ISNULL()` → `IFNULL()`, funciones `YEAR`, `MONTH`, `DAY`, `GETDATE`, `LEN`. Lo no soportado da un mensaje claro.
- **Corrección** (`src/sql/grade.ts`): compara columnas y filas con la solución y da pistas concretas (filas de más/menos, columnas que faltan, COUNT vs SUM, orden).
- **Temas** (`src/themes/`): cada tema = estilo visual + base de datos + ejercicios. Para agregar uno, crea su carpeta, exporta un `Theme` y regístralo en `src/themes/index.ts`.

## Bases de datos

- **Northwind** (`public/db/northwind.sql`): generada desde el script oficial de Microsoft
  ([sql-server-samples](https://github.com/microsoft/sql-server-samples), MIT) con
  `node scripts/build-northwind.mjs instnwnd.sql`. Todas las fechas están movidas +28 años (1996–1998 → 2024–2026).
