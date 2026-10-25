import type { Theme } from '../types'
import { exercises, levels } from './exercises'
import './dracula.css'

export const draculaPixel: Theme = {
  id: 'dracula',
  name: 'Dracula Pixel',
  appTitle: 'SQL QUEST',
  database: { id: 'northwind', name: 'Northwind', url: 'db/northwind.sql' },
  levels,
  exercises,
  progressStyle: 'xp',
}
