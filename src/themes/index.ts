import type { Theme } from './types'
import { draculaPixel } from './dracula'

// Registro de temas. El primero es el tema por defecto.
export const themes: Theme[] = [draculaPixel]

export const findTheme = (id: string | null) => themes.find((t) => t.id === id) ?? themes[0]
