// Un tema = estilo visual + base de datos + su propia lista de ejercicios.
// Para agregar un tema nuevo: crea una carpeta en src/themes/, exporta un Theme
// y regístralo en src/themes/index.ts. Sus estilos van en un CSS con [data-theme="<id>"].

export interface DatabaseDef {
  id: string
  name: string
  // Script SQL (SQLite) que crea y llena la base. Se sirve desde public/.
  url: string
}

export interface Level {
  id: string
  name: string
  topic: string
}

export interface Exercise {
  id: string
  levelId: string
  title: string
  prompt: string
  solution: string
  hints: string[]
  orderMatters: boolean
  boss?: boolean
  starter?: string
}

// Cómo se muestra el progreso en la barra superior.
export type ProgressStyle = 'xp' | 'medals'

export interface Theme {
  id: string
  name: string
  appTitle: string
  database: DatabaseDef
  levels: Level[]
  exercises: Exercise[]
  progressStyle: ProgressStyle
}
