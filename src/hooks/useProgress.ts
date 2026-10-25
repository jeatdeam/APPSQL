import { useCallback, useState } from 'react'

export interface ExerciseProgress {
  solved?: boolean
  xp?: number
  fails?: number
  hints?: number
  revealed?: boolean
  draft?: string
}

export type ThemeProgress = Record<string, ExerciseProgress>

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin localStorage (modo privado, etc.): el progreso solo dura la sesión.
  }
}

// Progreso de un tema, guardado en localStorage. El componente que lo usa
// se remonta al cambiar de tema, así que la clave es fija durante su vida.
export function useProgress(themeId: string) {
  const key = `appsql:progress:${themeId}`
  const [progress, setProgress] = useState(() => readStorage<ThemeProgress>(key, {}))

  const update = useCallback(
    (id: string, patch: Partial<ExerciseProgress>) => {
      setProgress((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } }
        writeStorage(key, next)
        return next
      })
    },
    [key],
  )

  return [progress, update] as const
}
