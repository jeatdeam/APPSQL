// Reglas de juego: vidas, XP y desbloqueo de ejercicios.
import type { Exercise } from './themes/types'
import type { ExerciseProgress, ThemeProgress } from './hooks/useProgress'

export const MAX_LIVES = 3
const XP_PER_LEVEL = 200

export const livesLeft = (p: ExerciseProgress | undefined) => Math.max(0, MAX_LIVES - (p?.fails ?? 0))

// XP al resolver: base menos penalizaciones por fallos y pistas; ver la solución no da XP.
export function xpReward(ex: Exercise, p: ExerciseProgress | undefined): number {
  if (p?.revealed) return 0
  const base = ex.boss ? 300 : 100
  const penalty = 25 * Math.min(p?.fails ?? 0, MAX_LIVES) + 10 * (p?.hints ?? 0)
  return Math.max(Math.round(base * 0.2), base - penalty)
}

export const totalXp = (progress: ThemeProgress) => Object.values(progress).reduce((sum, p) => sum + (p.xp ?? 0), 0)

export const playerLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1

// Un ejercicio se desbloquea al resolver el anterior.
export function isUnlocked(exercises: Exercise[], progress: ThemeProgress, index: number): boolean {
  return index === 0 || !!progress[exercises[index - 1].id]?.solved
}
