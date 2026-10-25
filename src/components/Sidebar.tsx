import type { Theme } from '../themes/types'
import type { ThemeProgress } from '../hooks/useProgress'
import { isUnlocked } from '../game'

interface Props {
  theme: Theme
  progress: ThemeProgress
  activeId: string
  onSelect: (id: string) => void
  open: boolean
}

export function Sidebar({ theme, progress, activeId, onSelect, open }: Props) {
  return (
    <nav id="levels-menu" className={`sidebar${open ? ' open' : ''}`} aria-label="Niveles y ejercicios">
      {theme.levels.map((level) => {
        const items = theme.exercises.map((ex, index) => ({ ex, index })).filter(({ ex }) => ex.levelId === level.id)
        return (
          <section key={level.id} className="level">
            <h2>
              <span className="level-name">{level.name}</span>
              <span className="level-topic">{level.topic}</span>
            </h2>
            {items.length === 0 ? (
              <p className="level-soon">Próximamente</p>
            ) : (
              <ul>
                {items.map(({ ex, index }) => {
                  const solved = !!progress[ex.id]?.solved
                  const unlocked = isUnlocked(theme.exercises, progress, index)
                  const active = ex.id === activeId
                  const status = solved ? 'solved' : unlocked ? 'open' : 'locked'
                  const icon = solved ? '✓' : !unlocked ? '🔒' : active ? '▶' : ex.boss ? '☠' : '·'
                  return (
                    <li key={ex.id}>
                      <button
                        className={`exercise-link ${status}${active ? ' active' : ''}${ex.boss ? ' boss' : ''}`}
                        disabled={!unlocked}
                        onClick={() => onSelect(ex.id)}
                        aria-current={active ? 'true' : undefined}
                      >
                        <span className="exercise-icon" aria-hidden>
                          {icon}
                        </span>
                        <span>{ex.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </nav>
  )
}
