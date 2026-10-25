import { useState } from 'react'
import type { Theme } from '../themes/types'
import type { QueryResult } from '../sql/engine'
import { grade } from '../sql/grade'
import { useEngine } from '../hooks/useEngine'
import { useProgress } from '../hooks/useProgress'
import { isUnlocked, livesLeft, totalXp, xpReward } from '../game'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { SqlEditor } from './SqlEditor'
import { ResultTable } from './ResultTable'
import { SchemaPanel } from './SchemaPanel'

interface Output {
  result?: QueryResult | null
  elapsedMs?: number
  error?: string
  feedback?: { correct: boolean; message: string }
}

interface Props {
  theme: Theme
  onThemeChange: (id: string) => void
}

export function Workspace({ theme, onThemeChange }: Props) {
  const [progress, update] = useProgress(theme.id)
  const { engine, schema, error: loadError } = useEngine(theme.database)
  const [activeId, setActiveId] = useState(() => (theme.exercises.find((e) => !progress[e.id]?.solved) ?? theme.exercises[0]).id)
  const [output, setOutput] = useState<Output>({})
  // Menú de niveles desplegable (solo se usa cuando la app es angosta).
  const [menuOpen, setMenuOpen] = useState(false)

  const index = theme.exercises.findIndex((e) => e.id === activeId)
  const exercise = theme.exercises[index]
  const p = progress[exercise.id]
  const sqlText = p?.draft ?? exercise.starter ?? ''
  const hintsShown = Math.min(p?.hints ?? 0, exercise.hints.length)
  const next = theme.exercises[index + 1]

  function select(id: string) {
    setActiveId(id)
    setOutput({})
    setMenuOpen(false)
  }

  function run() {
    if (!engine) return
    const out = engine.run(sqlText)
    setOutput(out.ok ? { result: out.result, elapsedMs: out.elapsedMs } : { error: out.error })
  }

  function check() {
    if (!engine) return
    const out = engine.run(sqlText)
    if (!out.ok) {
      setOutput({ error: out.error })
      return
    }
    const expected = engine.run(exercise.solution)
    if (!expected.ok || !expected.result) {
      setOutput({ error: `La solución de este ejercicio falló: ${expected.ok ? 'sin resultado' : expected.error}` })
      return
    }
    const g = grade(expected.result, out.result, sqlText, exercise.solution, exercise.orderMatters)
    let message = g.message
    if (!p?.solved) {
      if (g.correct) {
        const xp = xpReward(exercise, p)
        update(exercise.id, { solved: true, xp })
        message += xp > 0 ? ` +${xp} XP` : ' (sin XP porque viste la solución)'
      } else {
        update(exercise.id, { fails: (p?.fails ?? 0) + 1 })
      }
    }
    setOutput({ result: out.result, elapsedMs: out.elapsedMs, feedback: { correct: g.correct, message } })
  }

  const solvedCount = theme.exercises.filter((e) => progress[e.id]?.solved).length

  return (
    <div className="app">
      <TopBar theme={theme} onThemeChange={onThemeChange} xp={totalXp(progress)} lives={livesLeft(p)} solved={solvedCount} />

      <div className="main">
        <button className="levels-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="levels-menu">
          <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
          <span>Niveles</span>
          <span className="levels-toggle-current">
            {solvedCount}/{theme.exercises.length} · {exercise.title}
          </span>
          <span aria-hidden>{menuOpen ? '▲' : '▼'}</span>
        </button>
        <Sidebar theme={theme} progress={progress} activeId={activeId} onSelect={select} open={menuOpen} />

        <main className="exercise">
          <div className="exercise-head">
            <span className="exercise-tag">{exercise.boss ? '☠ NIVEL JEFE' : theme.levels.find((l) => l.id === exercise.levelId)?.topic}</span>
            <h2 className="exercise-title">{exercise.title}</h2>
            <p className="exercise-prompt">{exercise.prompt}</p>
          </div>

          <SqlEditor value={sqlText} onChange={(draft) => update(exercise.id, { draft })} onRun={run} schema={schema} />

          <div className="actions">
            <button className="btn btn-run" onClick={run} disabled={!engine}>
              ▶ Ejecutar
            </button>
            <button className="btn btn-check" onClick={check} disabled={!engine}>
              ✔ Comprobar
            </button>
            <button
              className="btn btn-hint"
              onClick={() => update(exercise.id, { hints: hintsShown + 1 })}
              disabled={hintsShown >= exercise.hints.length}
            >
              ? Pista {exercise.hints.length > 0 && `${hintsShown}/${exercise.hints.length}`}
            </button>
            <button className="btn btn-solution" onClick={() => update(exercise.id, { revealed: true })} disabled={p?.revealed}>
              👁 Ver solución
            </button>
            {p?.solved && next && isUnlocked(theme.exercises, progress, index + 1) && (
              <button className="btn btn-next" onClick={() => select(next.id)}>
                Siguiente →
              </button>
            )}
          </div>

          {!engine && !loadError && <p className="status">Cargando base {theme.database.name}…</p>}
          {loadError && <p className="message error">{loadError}</p>}

          {hintsShown > 0 && (
            <ul className="hints">
              {exercise.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i}>
                  <strong>Pista {i + 1}:</strong> {h}
                </li>
              ))}
            </ul>
          )}

          {p?.revealed && (
            <div className="solution">
              <div className="solution-head">
                <strong>Solución</strong>
                <button className="btn btn-small" onClick={() => update(exercise.id, { draft: exercise.solution })}>
                  Copiar al editor
                </button>
              </div>
              <pre>{exercise.solution}</pre>
            </div>
          )}

          {output.feedback && (
            <p className={`message ${output.feedback.correct ? 'success' : 'error'}`} role="status">
              {output.feedback.message}
            </p>
          )}
          {output.error && (
            <p className="message error" role="alert">
              {output.error}
            </p>
          )}
          {output.result && <ResultTable result={output.result} elapsedMs={output.elapsedMs} />}
          {output.result === null && !output.error && <p className="status">La consulta se ejecutó pero no devolvió filas.</p>}
        </main>
      </div>

      <SchemaPanel schema={schema} />
    </div>
  )
}
