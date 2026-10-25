import type { Theme } from '../themes/types'
import { themes } from '../themes'
import { MAX_LIVES, playerLevel } from '../game'

interface Props {
  theme: Theme
  onThemeChange: (id: string) => void
  xp: number
  lives: number
  solved: number
}

export function TopBar({ theme, onThemeChange, xp, lives, solved }: Props) {
  return (
    <header className="topbar">
      <h1 className="app-title">{theme.appTitle}</h1>
      <span className="db-badge" title="Base de datos activa">
        DB: {theme.database.name}
      </span>

      <div className="progress" aria-label="Progreso">
        {theme.progressStyle === 'xp' ? (
          <>
            <span className="lives" title={`Vidas en este ejercicio: ${lives} de ${MAX_LIVES}`}>
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <span key={i} className={i < lives ? 'heart full' : 'heart empty'}>
                  ♥
                </span>
              ))}
            </span>
            <span className="xp">XP {xp}</span>
            <span className="lv">LV {playerLevel(xp)}</span>
          </>
        ) : (
          <span className="medals">
            {solved}/{theme.exercises.length}
          </span>
        )}
      </div>

      <label className="theme-picker">
        <span>Tema</span>
        <select value={theme.id} onChange={(e) => onThemeChange(e.target.value)}>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  )
}
